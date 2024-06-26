import * as socket from 'socket.io-client';
import { ref } from 'vue'
import { ServerToClientEvents, ClientToServerEvents, Player, } from '../server/MultiplayerTypes';

export class MultiplayerClient {

  connection: socket.Socket<ServerToClientEvents, ClientToServerEvents>;
  playersOnline = ref("");
  localPlayerDisplayString = ref("");
  localPlayer : Player = {id: "", skin: -1};
  playerList: Player[] = [];
  serverTimeOffset : number = 0;

  constructor(skin : number) {
    console.log('setting up multiplayer client...')
    
    this.connection = socket.io(window.location.hostname+`:3000`, { query: { skin } });
    this.connection.on('connect', () => {
      console.log('connected to server :)')
    })

    this.connection.on('serverInfo', (serverDateNow) => {
      this.computeServerTimeOffset(serverDateNow);
    })

    this.connection.on('playerList', (playerList) => {
      this.playersOnline.value = `Players online: ${playerList.length}`;
      this.playerList = playerList;
    })

    this.connection.on('playerConnected', newPlayer => {
      console.log(`player ${newPlayer.id} connected`);
      if (newPlayer.id == this.connection.id) {
        this.localPlayer = newPlayer;
        this.localPlayerDisplayString.value = `Local player: ${newPlayer.id}`;

        // Check players list and instantiate necessary information of other players
        this.playerList.forEach(player => {
          if (player.id != this.localPlayer.id)
            this.processNewRemotePlayer(player);
        });
      }
      else this.processNewRemotePlayer(newPlayer);
    })
    this.connection.on('playerDisconnected', (id) => {
      console.log(`player ${id} disconnected`);
      this.onRemotePlayerDisconnectedCallbacks.forEach(cb => cb(id));
    })
    this.connection.on('serverSentPlayerFrameData', (serverTime, id, data, sentTime) => {
      this.computeServerTimeOffset(serverTime);
      this.onRemotePlayerFrameDataCallbacks.forEach(cb => cb(id, data, sentTime));
    })
  }

  processNewRemotePlayer(player : Player) {
    this.onRemotePlayerConnectedCallbacks.forEach(cb => cb(player));
  }

  private onRemotePlayerConnectedCallbacks : ((player : Player) => void)[] = [];

  onPlayerConnected(cb : (player : Player) => void) {
    this.onRemotePlayerConnectedCallbacks.push(cb);
  }

  private onRemotePlayerDisconnectedCallbacks : ((id: string) => void)[] = [];
  onRemotePlayerDisconnected(cb : (id: string) => void) {
    this.onRemotePlayerDisconnectedCallbacks.push(cb);
  }

  // Frame data
  sendLocalPlayerFrameData(data: any) {
    this.connection.emit('playerSentFrameData', data, Date.now());
  }

  private onRemotePlayerFrameDataCallbacks : ((id: string, data: any, sentTime: number) => void)[] = [];
  onRemotePlayerFrameData(cb: (id: string, data: any, sentTime: number) => void) {
    this.onRemotePlayerFrameDataCallbacks.push(cb);
  }

  disconnect() {
    if (this.connection)
      this.connection.close();
  }

  serverTimeMs() {
    return Date.now() + this.serverTimeOffset;
  }

  private computeServerTimeOffset(serverMessageTime : number) {
    let clientTimeMs = Date.now();
    let clientTime = new Date(clientTimeMs);
    let serverTime = new Date(serverMessageTime);
    this.serverTimeOffset = 0;

    if (Math.abs(serverMessageTime - clientTimeMs) > 5 * 60 * 1000) // if we are off more than 5 minutes something is off, maybe client is at different time zone
    {
      // TODO acount for people setting phones on weird years and times that are not NOW

      this.serverTimeOffset = serverTime.getTimezoneOffset() - clientTime.getTimezoneOffset();
      console.log(`client is at an offset of ${this.serverTimeOffset}`);
    }
  }
}
