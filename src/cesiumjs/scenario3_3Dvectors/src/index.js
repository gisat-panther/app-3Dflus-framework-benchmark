import {
    Transforms,
    Ion,
    Viewer,
    Color,
    HeadingPitchRoll,
    Cartesian3,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import "./css/main.css";
import chroma from "chroma-js";
import arrayShuffle from 'array-shuffle';
import {scaleLinear} from "d3-scale";
import * as dat from 'dat.gui';

// ---- GUI definition - start
const gui = new dat.GUI();
const settings = {
    numOfPoints: "1 000"
}
let guiNumOfPoints = gui.add(settings, 'numOfPoints', ['1 000', '10 000',]).name('Number of arrows').listen();

// ---- GUI definition - end

Ion.defaultAccessToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4NGNhMzk5NC1kYjk5LTQ5ZDEtOTM5Yy0zYmUyYWEwMjY5MmQiLCJpZCI6NTgyNjksImlhdCI6MTYyMzA1NTMyMX0.7jidfR2a2M5t8KsvDho5TJcBLBZl04UBj3jdeAB1otY";

const DATA_URLS = {
    "los32": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/los/32.json",
    "los142": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/los/142.json",
    "vertg32": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/vertg/32.json",
    "vertg142": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/vertg/142.json",
    "arrow": "../../data/glb/arrow.glb"
}
const getObjectCount = (value) => {
    switch (value) {
        case "1 000":
            object3D_count = 1000
            break;
        case "10 000":
            object3D_count = 10000
            break;
        default:
            object3D_count = 10000
    }
}

let object3D_count;
let point_urls = [DATA_URLS.los142];
getObjectCount(settings.numOfPoints)

let colorScale = chroma
    .scale(["#fda34b", "#ff7882", "#c8699e", "#7046aa", "#0c1db8", "#2eaaac"])
    .domain([-30, 10]);

let sizeScale = scaleLinear().domain([-30, 10]).range([1000, 200]).clamp(true);

let viewer = new Viewer("cesiumContainer");
let scene = viewer.scene;

const displayArrows = () => {
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

    Promise.all(promisedData).then(values => {
        let data = arrayShuffle(values.flat()).slice(0, object3D_count);
        console.log("Data length: ", data.length);
        data.forEach(d => {
            const coord = d.geometry.coordinates;
            const color = colorScale(d.properties.vel_avg);
            let height = d.properties.h_cop30m * 100;
            const position = Cartesian3.fromDegrees(coord[0], coord[1], height)
            const heading = d.properties.az_ang;
            const pitch = 180;
            const roll = d.properties.inc_ang;
            const hpr = new HeadingPitchRoll(heading, pitch, roll);
            const orientation = Transforms.headingPitchRollQuaternion(
                position,
                hpr
            );
            viewer.entities.add({
                position: position,
                orientation: orientation,
                model: {
                    scale: sizeScale(d.properties.vel_avg),
                    uri: DATA_URLS.arrow,
                    color: Color.fromCssColorString(color.name()),
                }
            });
        });
    })
}

displayArrows()

guiNumOfPoints.onChange(value => {
    viewer.entities.removeAll();
    getObjectCount(value)
    displayArrows()
})

let camera = viewer.camera;
camera.setView({
    destination: Cartesian3.fromDegrees(120.81321, 14.7569, 150000.0)
})
