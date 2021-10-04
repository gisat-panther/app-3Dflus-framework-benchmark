import WorldWind from "webworldwind-esa";
import "./css/main.css";
import chroma from "chroma-js";
import arrayShuffle from "array-shuffle";
import * as dat from "dat.gui";
import {ANIMATION_URLS} from "./animation_urls";

const {
    WorldWindow,
    Position,
    ElevationModel,
    SurfaceCircle,
    RenderableLayer,
    Location,
    Color,
    ShapeAttributes,
    Polygon,
    GeographicMesh,
    TriangleMesh,
} = WorldWind;

// ---- GUI definition - start
const gui = new dat.GUI();
const settings = {
    animationType: "real data 1 000",
};
let guiAnimType = gui
    .add(settings, "animationType", [
        "real data 1 000",
        "random data 10 000"
    ])
    .name("Animation type")
    .listen();
// ---- GUI definition - end

const URLS = [
    "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/los/32.json",
];

//animation constants
const FRAME_MIN_TIME = 100;
let lastFrameTime = 0;
let frameCount = 1000;
let currentFrame = 0;
let timelineDates = [];

let animation_type = settings.animationType;
let random_animated_points_count = 10000;

let animatedPointsData = [];

const setAnimationType = (value) => {
    animation_type = value;
    if (value === "random data 10 000") {
        random_animated_points_count = 10000;
    }
};

let colorScale = chroma
    .scale(["#fda34b", "#ff7882", "#c8699e", "#7046aa", "#0c1db8", "#2eaaac"])
    .domain([-30, 10]);

const elevationModel = new ElevationModel();
const wwd = new WorldWindow("map", elevationModel);
wwd.navigator.lookAtLocation.latitude = 14.7569;
wwd.navigator.lookAtLocation.longitude = 120.81321;
wwd.navigator.range = 200000;

wwd.addLayer(new WorldWind.BMNGLandsatLayer());

const pointLayer = new RenderableLayer();
wwd.addLayer(pointLayer);

// Create and add layers to the WorldWindow.
var layers = [
    // WorldWindow UI layers.
    {layer: new WorldWind.CompassLayer(), enabled: true},
    {layer: new WorldWind.CoordinatesDisplayLayer(wwd), enabled: true},
    {layer: new WorldWind.ViewControlsLayer(wwd), enabled: true},
];

for (var l = 0; l < layers.length; l++) {
    layers[l].layer.enabled = layers[l].enabled;
    wwd.addLayer(layers[l].layer);
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const loadAnimatedData = (entireDataset) => {
    let promisedData = [];
    ANIMATION_URLS.forEach((url) =>
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
    return Promise.all(promisedData).then((values) => values);
};

const createTimeArrays = (animatedData) => {
    animatedData.forEach((item, index) => {
        let timelineValues = [];
        Object.entries(item.properties).forEach(([key, value]) => {
            if (key.startsWith("d_")) {
                timelineValues.push(value == null ? 0 : value);
                if (index === 0) timelineDates.push(key);
            }
        });
        if (index === 0) frameCount = timelineValues.length;
        animatedData[index].d_timeline = timelineValues;
        animatedData[index].modified_height = item.properties.h_cop30m + 100000;
        animatedData[index].coordinate_update = timelineValues[0];
    });
    return animatedData;
};

const animate = (time) => {
    if (time - lastFrameTime < FRAME_MIN_TIME) {
        window.requestAnimationFrame(animate);
        return;
    }
    // console.log("xxx animate", lastFrameTime, time);

    lastFrameTime = time;

    pointLayer.removeAllRenderables();

    animatedPointsData.forEach((d, index) => {
        if (currentFrame === 0) {
            d.modified_height = d.properties.h_cop30m + 100000;
        }
        if (currentFrame < frameCount) {
            currentFrame++;
        } else {
            currentFrame = 0;
        }

        if (animation_type === "real data 1 000") {
            d.modified_height =
                d.modified_height + d.d_timeline[currentFrame] * 5;
        } else {
            d.modified_height =
                d.modified_height + getRandomInt(-1000, 1000);
        }

        const coord = d.geometry.coordinates;
        const color = colorScale(d.properties.vel_avg);
        // console.log("xxx d.modified_height", d.modified_height);
        const position = new Position(coord[1], coord[0], d.modified_height);

        const meshPositions = []; // Use a new positions array.
        meshPositions.push(position); // the mesh center

        const numRadialPositions = 10;
        const meshIndices = [];
        const outlineIndices = [];
        const meshRadius = 0.005; // degrees

        for (let angle = 0; angle < 360; angle += 360 / numRadialPositions) {
            const angleRadians = angle * WorldWind.Angle.DEGREES_TO_RADIANS;
            const lat =
                meshPositions[0].latitude + Math.sin(angleRadians) * meshRadius;
            const lon =
                meshPositions[0].longitude + Math.cos(angleRadians) * meshRadius;

            meshPositions.push(new WorldWind.Position(lat, lon, d.modified_height));
        }

        // Create the mesh indices.
        for (var k = 1; k < numRadialPositions; k++) {
            meshIndices.push(0);
            meshIndices.push(k);
            meshIndices.push(k + 1);
        }
        // Close the circle.
        meshIndices.push(0);
        meshIndices.push(numRadialPositions);
        meshIndices.push(1);

        // Create the outline indices.
        for (var j = 1; j <= numRadialPositions; j++) {
            outlineIndices.push(j);
        }
        // Close the outline.
        outlineIndices.push(1);

        const surfaceCircle = new TriangleMesh(
            meshPositions,
            meshIndices,
            new ShapeAttributes({
                _drawOutline: true,
                _interiorColor: new Color(
                    color.rgb()[0] / 255,
                    color.rgb()[1] / 255,
                    color.rgb()[2] / 255,
                    1
                ),
                _drawInterior: true,
                _outlineColor: new Color(
                    color.rgb()[0] / 255,
                    color.rgb()[1] / 255,
                    color.rgb()[2] / 255,
                    1
                ),
                _outlineStippleFactor: 0,
                _outlineStipplePattern: 0,
                _outlineWidth: 0,
            })
        );
        pointLayer.addRenderable(surfaceCircle);
    });
    requestAnimationFrame(animate);
    wwd.redraw();
};

const displayAnimation = () => {
    if (animation_type === "real data 1 000") {
        let promisedData = [];
        ANIMATION_URLS.forEach((url) =>
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
        Promise.all(promisedData).then((values) => {
            animatedPointsData = createTimeArrays(values.flat());
            animate();
        });
    } else {
        let promisedData = [];
        URLS.forEach((url) =>
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
        Promise.all(promisedData).then((values) => {
            let data = arrayShuffle(values.flat()).slice(
                0,
                random_animated_points_count
            );
            console.log("Data length: ", data.length);
            data.forEach((value, index) => {
                data[index].modified_height = value.properties.h_cop30m + 10000;
            });
            animatedPointsData = data;
            animate();
        });
    }
};

displayAnimation();

guiAnimType.onChange((value) => {
    pointLayer.removeAllRenderables();
    setAnimationType(value)
    displayAnimation()
});
