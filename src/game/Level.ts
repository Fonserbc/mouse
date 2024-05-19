import { BoxGeometry, Mesh, MeshToonMaterial, Object3D, PlaneGeometry, Texture, TextureLoader, Vector2, Vector3, NearestFilter, SRGBColorSpace, AxesHelper } from "three";
import wallImage from "../assets/mc/grassdirt.png"
import topImage from "../assets/mc/grass.png"
import floorImage from "../assets/mc/dirt.png";
import { MouseholeGeometry } from "./extensions/MouseholeGeometry"

export const DEFAULT_LEVEL: LevelName = 'lab'

type LevelName = 'ohio' | 'lab'


export interface LevelMetaData {
  name: LevelName,
  tileSize: number,
  wallHeight: number,
  sky: URL,
  ascii: string,
}


const CARDINAL = [new Vector2(0, 1), new Vector2(1, 0), new Vector2(0, -1), new Vector2(-1, 0)];
const DIAGONAL = [new Vector2(1, 1), new Vector2(1, -1), new Vector2(-1, -1), new Vector2(-1, 1)];

export { CARDINAL, DIAGONAL };

export class Level {
    object: Object3D = new Object3D();
    start: Vector2 = new Vector2();
    levelData: string[][] = [];
    rows = 0;
    columns = 0;
    tileSize: number;
    wallHeight: number;

    constructor(level: LevelMetaData, toonRamp: Texture) {
        this.tileSize = level.tileSize
        this.wallHeight = level.wallHeight

        console.log("Loading level.. ");
        console.log(level.ascii);

        let currentRow: string[] = [];

        for (let s = 0; s < level.ascii.length; ++s) {
            let v = level.ascii[s];
            if (v == '\r') continue;
            if (v == '\n') {
                this.levelData.push(currentRow);
                this.rows++;
                currentRow = [];
                continue;
            }
            currentRow.push(v);
            this.columns = Math.max(this.columns, currentRow.length);

            if (v == 's') { // Start
                this.start.set(currentRow.length - 1, this.levelData.length);
            }
        }
        this.levelData.push(currentRow);
        this.rows++;

        const texLoader = new TextureLoader();
        const wallTexture = texLoader.load(wallImage)
        wallTexture.colorSpace = SRGBColorSpace
        wallTexture.minFilter = NearestFilter
        wallTexture.magFilter = NearestFilter

        const floorTexture = texLoader.load(floorImage)
        floorTexture.colorSpace = SRGBColorSpace
        floorTexture.minFilter = NearestFilter
        floorTexture.magFilter = NearestFilter
        const floorMaterial = new MeshToonMaterial({ color: 0xffffff, gradientMap: toonRamp, map: floorTexture })

        const topTexture = new TextureLoader().load(topImage);
        topTexture.colorSpace = SRGBColorSpace
        topTexture.minFilter = NearestFilter;
        topTexture.magFilter = NearestFilter;

        // Load the brick texture
        const sideTexture = new TextureLoader().load(wallImage);
        sideTexture.colorSpace = SRGBColorSpace;
        sideTexture.minFilter = NearestFilter;
        sideTexture.magFilter = NearestFilter;

        // Create materials for each face of the wall
        const wallMaterials = [
            new MeshToonMaterial({ color: 0xffffff, gradientMap: toonRamp, map: sideTexture }), // Front face
            new MeshToonMaterial({ color: 0xffffff, gradientMap: toonRamp, map: sideTexture }), // Back face
            new MeshToonMaterial({ color: 0xffffff, gradientMap: toonRamp, map: topTexture }), // Top face
            new MeshToonMaterial({ color: 0xffffff, gradientMap: toonRamp, map: sideTexture }), // Bottom face
            new MeshToonMaterial({ color: 0xffffff, gradientMap: toonRamp, map: sideTexture }), // Right face
            new MeshToonMaterial({ color: 0xffffff, gradientMap: toonRamp, map: sideTexture })  // Left face
        ];
        const mouseholeMaterial = new MeshToonMaterial({ color: 0xffffff, gradientMap: toonRamp, map: sideTexture });
        const mouseholeInsideMaterial = new MeshToonMaterial({ color: 0x444444, gradientMap: toonRamp, map: sideTexture });
        const mouseholeTopMaterial = new MeshToonMaterial({ color: 0xffffff, gradientMap: toonRamp, map: topTexture });
        const mouseholeFloorMaterial = new MeshToonMaterial({ color: 0x666666, gradientMap: toonRamp, map: floorTexture });

        // Create a geometry for the wall
        const wallGeometry = new BoxGeometry(this.tileSize, this.wallHeight, this.tileSize, 1, 1, 1);

        let holeWidth = this.tileSize * 0.5;
        const holeGeometry = new MouseholeGeometry(this.tileSize, this.wallHeight, holeWidth);


        // Create a mesh for the wall using the materials array
        const wallMesh = new Mesh(wallGeometry, wallMaterials);
        const floorMesh = new Mesh(new PlaneGeometry(this.tileSize, this.tileSize, 1, 1), floorMaterial);
        const holeMesh = new Mesh(holeGeometry, [mouseholeMaterial])
        const holeRoofMesh = new Mesh(new PlaneGeometry(this.tileSize, this.tileSize, 1, 1), mouseholeTopMaterial);
        const holeFloorMesh = new Mesh(new PlaneGeometry(this.tileSize, this.tileSize, 1, 1), mouseholeFloorMaterial);
        const holeWallMesh = new Mesh(new PlaneGeometry(this.tileSize, this.wallHeight, 1, 1), mouseholeInsideMaterial);
        const wall = new Object3D();
        wallMesh.position.y = this.wallHeight * 0.5;
        wall.add(wallMesh);
        const floor = new Object3D();
        floorMesh.rotation.x -= Math.PI * 0.5;
        // ceilingMesh.rotation.x += Math.PI * 0.5;
        // ceilingMesh.position.y = this.tileSize;
        floor.add(floorMesh);
        //floor.add(ceilingMesh);

        const exit = new Object3D();
        holeRoofMesh.rotation.x -= Math.PI * 0.5;
        holeRoofMesh.position.y = this.tileSize;
        holeFloorMesh.rotation.x -= Math.PI * 0.5;
        exit.add(holeMesh);
        exit.add(holeRoofMesh);
        exit.add(holeFloorMesh);
        holeWallMesh.position.y = this.wallHeight * 0.5;
        exit.add(holeWallMesh);
        let sideWall1 = holeWallMesh.clone();
        sideWall1.position.x = -holeWidth * 0.5;
        sideWall1.rotation.y = Math.PI * 0.5;
        exit.add(sideWall1);
        let sideWall2 = sideWall1.clone();
        sideWall2.position.x = holeWidth * 0.5;
        sideWall2.rotation.y = -Math.PI * 0.5;
        exit.add(sideWall2);
        exit.add(new AxesHelper());

        this.object.matrixAutoUpdate = false;

        // extremely simple instantiation (not the most efficient, too many vertices and meshes)
        let needsWall: Map<number, Set<number>> = new Map<number, Set<number>>();
        let setWallNeded = function(i: number, j: number) {
            if (!needsWall.has(j)) {
                let s = new Set<number>();
                s.add(i);
                needsWall.set(j, s);
            }
            else if (!needsWall.get(j)?.has(i)) {
                needsWall.get(j)?.add(i);
            }
        }
        for (let j = 0; j < this.levelData.length; ++j) {
            for (let i = 0; i < this.levelData[j].length; ++i) {
                if (this.levelData[j][i] != ' ') // if we have a floor
                {
                    if (this.levelData[j][i] == 'e') {
                        let e = exit.clone();
                        e.position.set(i * this.tileSize, 0, j * this.tileSize);
                        // TODO rotate the exit depending if neighbours are walkable
                        this.object.add(e);
                    }
                    else {
                        let f = floor.clone();
                        f.position.set(i * this.tileSize, 0, j * this.tileSize);
                        this.object.add(f);

                        let scope = this;
                        CARDINAL.forEach(v => {
                            if (!scope.isTileWalkable(i + v.x, j + v.y))
                                setWallNeded(i + v.x, j + v.y);
                        })
                    }
                }
            }
        }

        needsWall.forEach((s: Set<number>, j: number) => {
            s.forEach(i => {
                let w = wall.clone();
                w.position.set(i * this.tileSize, 0, j * this.tileSize);
                this.object.add(w);
            });
        });

        this.object.position.set(this.tileSize * 0.5, 0, this.tileSize * 0.5);
        this.object.updateMatrixWorld(true);
    }

    isTileWalkable(i: number, j: number) {
        return i >= 0 && j >= 0 && j < this.levelData.length && i < this.levelData[j].length && this.levelData[j][i] != ' ';
    }

    getWorldPositionFromTile(p: Vector2, out: Vector3): Vector3 {
        out.set(p.x * this.tileSize, 0, p.y * this.tileSize);
        return out;
    }

    getTileFromWorldPosition(p: Vector3, out: Vector2): Vector2 {
        out.set(Math.floor((p.x + 0.5 * this.tileSize) / this.tileSize), Math.floor((p.z + 0.5 * this.tileSize) / this.tileSize));
        return out;
    }

    collisionV2 = new Vector2();
    collisionV22 = new Vector2();
    collideCircle(p: Vector3, r: number): boolean {   // PRECONDITION: r < this.tileSize
        let tile = this.getTileFromWorldPosition(p, this.collisionV2);

        if (!this.isTileWalkable(tile.x, tile.y)) {
            return true;
        }

        let halfTileSize = this.tileSize * 0.5;
        let collided = false;
        CARDINAL.forEach(v => {
            let tileX = tile.x + v.x;
            let tileY = tile.y + v.y;
            if (!this.isTileWalkable(tileX, tileY)) {
                let tileCenterX = tileX * this.tileSize;
                let tileCenterZ = tileY * this.tileSize;
                if (v.x > 0 && p.x + r > tileCenterX - halfTileSize) {
                    p.x = tileCenterX - halfTileSize - r;
                    collided = true;
                }
                else if (v.x < 0 && p.x - r < tileCenterX + halfTileSize) {
                    p.x = tileCenterX + halfTileSize + r;
                    collided = true;
                }
                if (v.y > 0 && p.z + r > tileCenterZ - halfTileSize) {
                    p.z = tileCenterZ - halfTileSize - r;
                    collided = true;
                }
                else if (v.y < 0 && p.z - r < tileCenterZ + halfTileSize) {
                    p.z = tileCenterZ + halfTileSize + r;
                    collided = true;
                    //console.log(`collided with tile (${tileX}, ${tileY})`);
                }
            }
        });

        let r2 = r * r;
        let deltaPos = this.collisionV22;
        DIAGONAL.forEach(v => {
            let tileX = tile.x + v.x;
            let tileY = tile.y + v.y;
            if (!this.isTileWalkable(tileX, tileY)) {
                let closestCornerX = tileX * this.tileSize - v.x * halfTileSize;
                let closestCornerZ = tileY * this.tileSize - v.y * halfTileSize;

                deltaPos.set(p.x - closestCornerX, p.z - closestCornerZ);
                if (deltaPos.lengthSq() < r2) {
                    collided = true;

                    deltaPos.normalize().multiplyScalar(r);
                    p.x = closestCornerX + deltaPos.x;
                    p.z = closestCornerZ + deltaPos.y;
                }
            }
        });

        return collided;
    }

    findClosestWalkableTile(p: Vector2): Vector2 {
        let v = p.clone();





        return v;
    }
}
