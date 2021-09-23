import {
    Ion,
    Viewer,
    CesiumTerrainProvider,
    Color,
    PointPrimitiveCollection,
    IonResource,
    Cartesian3,
    EllipsoidTerrainProvider
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import "./css/main.css";
import chroma from "chroma-js";
import * as dat from 'dat.gui';

// ---- GUI definition - start
const gui = new dat.GUI();
const settings = {
    numOfPoints: "400 000",
    showTerrain: false
}
let guiNumOfPoints = gui.add(settings, 'numOfPoints', ['40 000', '400 000', '900 000', '1 700 000']).name('Number of points').listen();
let guiShowTerrain = gui.add(settings, 'showTerrain').name('Show terrain').listen()

// ---- GUI definition - end

Ion.defaultAccessToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4NGNhMzk5NC1kYjk5LTQ5ZDEtOTM5Yy0zYmUyYWEwMjY5MmQiLCJpZCI6NTgyNjksImlhdCI6MTYyMzA1NTMyMX0.7jidfR2a2M5t8KsvDho5TJcBLBZl04UBj3jdeAB1otY";

const DATA_URLS = {
    "los32": "./data/od_Michala/32.json",
    "los142": "./data/od_Michala/142.json",
    "terrain": 585933
};

const getPointUrls = (number) => {
    switch (number) {
        // case "40 000":
        //     point_urls = [DATA_URLS.los142Decimated]
        //     break;
        case "400 000":
            point_urls = [DATA_URLS.los142]
            break;
        case "900 000":
            point_urls = [DATA_URLS.los32, DATA_URLS.los142]
            break;
        // case "1 700 000":
        //     point_urls = [DATA_URLS.los32, DATA_URLS.los142, DATA_URLS.vertg32, DATA_URLS.vertg142]
        //     break;
        default:
            point_urls = [DATA_URLS.los142]
    }
}

let point_urls = [];
getPointUrls(settings.numOfPoints)

let colorScale = chroma
    .scale(["#fda34b", "#ff7882", "#c8699e", "#7046aa", "#0c1db8", "#2eaaac"])
    .domain([-30, 10]);


let viewer = new Viewer("cesiumContainer");
let scene = viewer.scene;
let terrainProvider =  new CesiumTerrainProvider({
        url: IonResource.fromAssetId(DATA_URLS.terrain),
    })

const displayPoints = () => {
    let points = scene.primitives.add(new PointPrimitiveCollection());

    let promisedData = [];
    point_urls.forEach((url) =>
        promisedData.push(
            new Promise((resolve) =>
                resolve(
                    fetch(url).then((response) => {
                        return response.json();
                    })
                )
            )
        )
    );

        Promise.all(promisedData)
            .then((values) => {
                let data = values.flat();
                console.log("Points count: ", data.length);
                data.forEach((d) => {
                    const coord = d.geometry.coordinates;
                    const color = colorScale(d.properties.vel_avg);
                    let height = d.properties.h_cop30m * 100;
                    points.add({
                        position: Cartesian3.fromDegrees(coord[0], coord[1], height),
                        color: Color.fromCssColorString(color.name()),
                        pixelSize: 3,
                    });
                });
            })
            .catch((err) => {
                console.log(err);
            });
}

const displayTerrain = (showTerrain) => {
    if (showTerrain){
        scene.terrainProvider = terrainProvider
        scene.terrainExaggeration = 10.0;
    }
    else {
        scene.terrainProvider = new EllipsoidTerrainProvider({});
    }
}

displayPoints()
displayTerrain(settings.showTerrain)

guiNumOfPoints.onChange(value => {
    scene.primitives.removeAll();
    getPointUrls(value)
    displayPoints()
})

guiShowTerrain.onChange(showTerrain => displayTerrain(showTerrain))

let camera = viewer.camera;
camera.setView({
    destination: Cartesian3.fromDegrees(120.81321, 14.7569, 150000.0)
})
