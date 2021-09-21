import {
    Ion,
    Viewer,
    Color,
    PointPrimitiveCollection,
    Cartesian3,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import "./css/main.css";
import chroma from "chroma-js";
import * as dat from 'dat.gui';

// ---- GUI definition - start
const gui = new dat.GUI();
const settings = {
    numOfPoints: "40 000",
    showBuildings: false
}
let guiNumOfPoints = gui.add(settings, 'numOfPoints', ['40 000', '400 000', '900 000', '1 700 000']).name('Number of points').listen();
let guiBuildings = gui.add(settings, 'showBuildings').name('Show buildings').listen()

// ---- GUI definition - end


Ion.defaultAccessToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4NGNhMzk5NC1kYjk5LTQ5ZDEtOTM5Yy0zYmUyYWEwMjY5MmQiLCJpZCI6NTgyNjksImlhdCI6MTYyMzA1NTMyMX0.7jidfR2a2M5t8KsvDho5TJcBLBZl04UBj3jdeAB1otY";

const DATA_URLS = {
    // "los32": "./data/interferometry/los/32.json",
    "los32": "https://ptr.gisat.cz/ftpstorage/applications/emsn091Manila/interferometry/los/32.json",
    // "los142": "./data/interferometry/los/142.json",
    "los142": "https://ptr.gisat.cz/ftpstorage/applications/emsn091Manila/interferometry/los/142.json",
    // "los142Decimated": "./data/interferometry/los/142_decimated.json",
    "los142Decimated": "https://ptr.gisat.cz/ftpstorage/applications/emsn091Manila/interferometry/los/142_decimated.json",
    // "vertg32": "./data/interferometry/vertg/32.json",
    "vertg32": "https://ptr.gisat.cz/ftpstorage/applications/emsn091Manila/interferometry/vertg/32.json",
    // "vertg142": "./data/interferometry/vertg/142.json",
    "vertg142": "https://ptr.gisat.cz/ftpstorage/applications/emsn091Manila/interferometry/vertg/142.json",
    "buildings": "./data/manila_buildings_larger_than_250.geojson",
    // "buildings": "http://localhost:8080/data/manila_buildings_larger_than_250.geojson"
}

const getPointUrls = (number) => {
    switch (number) {
        case "40 000":
            point_urls = [DATA_URLS.los142Decimated]
            break;
        case "400 000":
            point_urls = [DATA_URLS.los142]
            break;
        case "900 000":
            point_urls = [DATA_URLS.los32, DATA_URLS.los142, DATA_URLS.los142Decimated]
            break;
        case "1 700 000":
            point_urls = [DATA_URLS.los32, DATA_URLS.los142, DATA_URLS.vertg32, DATA_URLS.vertg142, DATA_URLS.los142Decimated]
            break;
        default:
            point_urls = [DATA_URLS.los142]
    }
}

const getBuildingUrl = (showBuilding) => {
    if (showBuilding) building_url = DATA_URLS.buildings
    else building_url = ""
}
let point_urls = [];
let building_url = ""

getBuildingUrl(settings.showBuildings)
getPointUrls(settings.numOfPoints)


let colorScale = chroma
    .scale(["#fda34b", "#ff7882", "#c8699e", "#7046aa", "#0c1db8", "#2eaaac"])
    .domain([-30, 10]);


const loadBuildingData = async (url) => {
    let promisedData = await fetch(url);
    let jsonData = await promisedData.json();
    return jsonData.features;
};


let viewer = new Viewer("cesiumContainer");
let scene = viewer.scene;

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
                points.add({
                    position: Cartesian3.fromDegrees(coord[0], coord[1], 0),
                    color: Color.fromCssColorString(color.name()),
                    pixelSize: 3,
                });
            });
        })
        .catch((err) => {
            console.log(err);
        });
}

const displayBuildings = () => {
    if (settings.showBuildings && building_url.length > 0) {
        loadBuildingData().then((features) => {
            features.forEach((feature) => {
                viewer.entities.add({
                    name: feature.properties.osm_id,
                    polygon: {
                        hierarchy: Cartesian3.fromDegreesArray(
                            feature.geometry.coordinates[0].flat().flat()
                        ),
                        extrudedHeight: Math.random() * 100,
                        material: Color.fromCssColorString("#A0FAB4"),
                        closeTop: true,
                        closeBottom: false,
                        outline: true,
                        outlineColor: Color.fromCssColorString("#A0FAB4"),
                    },
                });
            });
        });
    }
}

displayPoints()
displayBuildings()

guiNumOfPoints.onChange(value => {
    scene.primitives.removeAll();
    getPointUrls(value)
    displayPoints()
})

guiBuildings.onChange(showBuildings => {
    viewer.entities.removeAll();
    getBuildingUrl(showBuildings)
    displayBuildings()
})

let camera = viewer.camera;
camera.setView({
    destination: Cartesian3.fromDegrees(120.81321, 14.7569, 150000.0)
})
