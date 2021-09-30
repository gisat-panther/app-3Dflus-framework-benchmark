import WorldWind from 'webworldwind-esa';
import chroma from "chroma-js";
import "./css/main.css";
import * as dat from 'dat.gui';
import arrayShuffle from 'array-shuffle';

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
    TriangleMesh
} = WorldWind;

// ---- GUI definition - start
const gui = new dat.GUI();
const settings = {
    numOfPoints: "10 000",
    showTerrain: false
}
let guiNumOfPoints = gui.add(settings, 'numOfPoints', ['10 000', '100 000']).name('Number of points').listen();

// ---- GUI definition - end

const DATA_URLS = {
    "los32": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/los/32.json",
    "los142": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/los/142.json",
    "vertg32": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/vertg/32.json",
    "vertg142": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/vertg/142.json",
};

let max_point_count = 10000

const getPointUrls = (number) => {
    switch (number) {
        case "10 000":
            max_point_count = 10000;
            break;
        case "100 000":
            max_point_count = 100000;
            break;
        default:
            max_point_count = 10000
    }
}

let point_urls = [DATA_URLS.los142];
getPointUrls(settings.numOfPoints)

let colorScale = chroma
    .scale(["#fda34b", "#ff7882", "#c8699e", "#7046aa", "#0c1db8", "#2eaaac"])
    .domain([-30, 10]);

const elevationModel = new ElevationModel();
const wwd = new WorldWindow('map', elevationModel);
wwd.navigator.lookAtLocation.latitude = 14.7569
wwd.navigator.lookAtLocation.longitude = 120.81321;
wwd.navigator.range = 200000;

wwd.addLayer(new WorldWind.BMNGOneImageLayer());
// wwd.addLayer(new WorldWind.BMNGLandsatLayer());

//layer for points
const pointLayer = new RenderableLayer();
const buildingsLayer = new RenderableLayer();
wwd.addLayer(pointLayer);
wwd.addLayer(buildingsLayer);

// Create and add layers to the WorldWindow.
var layers = [
    // WorldWindow UI layers.
    {layer: new WorldWind.CompassLayer(), enabled: true},
    {layer: new WorldWind.CoordinatesDisplayLayer(wwd), enabled: true},
    {layer: new WorldWind.ViewControlsLayer(wwd), enabled: true}
];

for (var l = 0; l < layers.length; l++) {
    layers[l].layer.enabled = layers[l].enabled;
    wwd.addLayer(layers[l].layer);
}

wwd.redraw();

const displayPoints = () => {
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
            let i = 0
            data = arrayShuffle(data);
            data.forEach((d, index) => {
                if (index < max_point_count) {
                    const coord = d.geometry.coordinates;
                    const color = colorScale(d.properties.vel_avg);
                    const height = d.properties.h_cop30m * 100;
                    const position = new Position(coord[1], coord[0], height);

                    const meshPositions = []; // Use a new positions array.
                    meshPositions.push(position); // the mesh center

                    const numRadialPositions = 10;
                    let meshIndices = [];
                    let outlineIndices = [];
                    const meshRadius = 0.005; // degrees

                    for (let angle = 0; angle < 360; angle += 360 / numRadialPositions) {
                        const angleRadians = angle * WorldWind.Angle.DEGREES_TO_RADIANS;
                        const lat = meshPositions[0].latitude + Math.sin(angleRadians) * meshRadius;
                        const lon = meshPositions[0].longitude + Math.cos(angleRadians) * meshRadius;

                        meshPositions.push(new WorldWind.Position(lat, lon, height));
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

                    const surfaceCircle = new TriangleMesh(meshPositions, meshIndices, new ShapeAttributes({
                        _drawOutline: true,
                        _interiorColor: new Color(color.rgb()[0] / 255, color.rgb()[1] / 255, color.rgb()[2] / 255, 1),
                        _drawInterior: true,
                        _outlineColor: new Color(color.rgb()[0] / 255, color.rgb()[1] / 255, color.rgb()[2] / 255, 1),
                        _outlineStippleFactor: 0,
                        _outlineStipplePattern: 0,
                        _outlineWidth: 0,
                    }));
                    pointLayer.addRenderable(surfaceCircle);
                    i++;
                }
            });
        })
        .catch((err) => {
            console.log(err);
        });
}

displayPoints()

guiNumOfPoints.onChange(value => {
    pointLayer.removeAllRenderables();
    getPointUrls(value)
    displayPoints()
})