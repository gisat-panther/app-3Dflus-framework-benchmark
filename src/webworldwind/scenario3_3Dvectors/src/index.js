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
    TriangleMesh,
    ColladaLoader
} = WorldWind;

// ---- GUI definition - start
const gui = new dat.GUI();
const settings = {
    numOfPoints: "1 000",
    showTerrain: false
}
let guiNumOfPoints = gui.add(settings, 'numOfPoints', ['1 000', '10 000']).name('Number of points').listen();

// ---- GUI definition - end

const DATA_URLS = {
    "los32": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/los/32.json",
    "los142": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/los/142.json",
    "vertg32": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/vertg/32.json",
    "vertg142": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/vertg/142.json",
};

let max_point_count = 1000

const getPointUrls = (number) => {
    switch (number) {
        case "1 000":
            max_point_count = 1000;
            break;
        case "10 000":
            max_point_count = 10000;
            break;
        default:
            max_point_count = 1000
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
wwd.addLayer(new WorldWind.BMNGLandsatLayer());

//layer for points
const pointLayer = new RenderableLayer();
wwd.addLayer(pointLayer);

let modelLayer = new RenderableLayer();
wwd.addLayer(modelLayer);

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

                    const config = {dirPath: './data/collada/'};
                    let colladaLoader = new ColladaLoader(position, config);

                    colladaLoader.load("arrow.dae", function (colladaModel) {
                        colladaModel.scale = 3000 + d.properties.vel_avg * 100;
                        colladaModel.xRotation = d.properties.az_ang;
                        colladaModel.yRotation = d.properties.inc_ang;
                        // colladaModel._entities.forEach(entity=> {
                        //     entity.material.diffuse = [...color.rgb(), 1];
                        //     entity.material.specular = [...color.rgb(), 1];
                        // })
                        colladaModel.materials.b0b0b0.diffuse = [...color.rgb(), 1];
                        // colladaModel.materials.b0b0b0.specular = [...color.rgb(), 1];
                        modelLayer.addRenderable(colladaModel);
                    });
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