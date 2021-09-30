import WorldWind from 'webworldwind-esa';
import "./css/main.css";
import chroma from "chroma-js";
import * as dat from 'dat.gui';

const {
    WorldWindow,
    Position,
    ElevationModel,
    SurfaceCircle,
    RenderableLayer,
    Location,
    Color,
    ShapeAttributes,
    Polygon
} = WorldWind;

// ---- GUI definition - start
const gui = new dat.GUI();
const settings = {
    numOfPoints: "40 000",
    showBuildings: false
}
let guiNumOfPoints = gui.add(settings, 'numOfPoints', ['40 000', '100 000']).name('Number of points').listen();
let guiBuildings = gui.add(settings, 'showBuildings').name('Show buildings').listen()
// ---- GUI definition - end


const DATA_URLS = {
    "los32": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/los/32.json",
    "los142": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/los/142.json",
    "los142Decimated": "../../data/interferometry/los/142_decimated.json",
    "vertg32": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/vertg/32.json",
    "vertg142": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/vertg/142.json",
    "buildings": "https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/buildings/manila_buildings_larger_than_250.geojson",
}

const MAX_POLYGON_COUNT = 20000;
const MAX_POINT_COUNT = 100000

const getPointUrls = (number) => {
    switch (number) {
        case "40 000":
            point_urls = [DATA_URLS.los142Decimated]
            break;
        case "100 000":
            point_urls = [DATA_URLS.los142]
            break;
        default:
            point_urls = [DATA_URLS.los142Decimated]
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


const elevationModel = new ElevationModel();
const wwd = new WorldWindow('map', elevationModel);
wwd.navigator.lookAtLocation.latitude = 14.7569
wwd.navigator.lookAtLocation.longitude = 120.81321;
wwd.navigator.range = 200000;


wwd.addLayer(new WorldWind.BMNGOneImageLayer());
wwd.addLayer(new WorldWind.BMNGLandsatLayer());

//layer for points
const pointLayer = new RenderableLayer();
const buildingsLayer = new RenderableLayer();
wwd.addLayer(pointLayer);
wwd.addLayer(buildingsLayer);

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
            data.forEach((d, index) => {
                if (index < MAX_POINT_COUNT) {
                    const coord = d.geometry.coordinates;
                    const color = colorScale(d.properties.vel_avg);
                    const surfaceCircle = new SurfaceCircle(new Location(coord[1], coord[0]), 100, new ShapeAttributes({
                        _drawOutline: false,
                        _interiorColor: new Color(color.rgb()[0] / 255, color.rgb()[1] / 255, color.rgb()[2] / 255, 1),
                        _drawInterior: true,
                        _outlineColor: new Color(0, 0, 0, 0),
                        _outlineStippleFactor: 0,
                        _outlineStipplePattern: 0,
                        _outlineWidth: 0,

                    }));
                    pointLayer.addRenderable(surfaceCircle);
                }
            });
        })
        .catch((err) => {
            console.log(err);
        });
}

const displayBuildings = () => {
    if (settings.showBuildings && building_url.length > 0) {
        loadBuildingData(building_url).then((features) => {
            let boundaries = [];
            features.forEach((feature, index) => {
                if (index < MAX_POLYGON_COUNT) {
                    const b = [];
                    const height = Math.random() * 1000
                    for (const point of feature.geometry.coordinates[0].flat()) {
                        b.push(new WorldWind.Position(point[1], point[0], height));
                    }
                    boundaries.push(b);
                }
            });

            const polygon = new Polygon(boundaries, null);
            polygon.altitudeMode = WorldWind.ABSOLUTE;
            polygon.extrude = true; // extrude the polygon edges to the ground


            const polygonAttributes = new ShapeAttributes(null);
            polygonAttributes.drawInterior = true;
            polygonAttributes.drawOutline = true;
            polygonAttributes.outlineColor = new WorldWind.Color(160 / 255, 250 / 255, 180 / 255, 0.9);
            polygonAttributes.interiorColor = new WorldWind.Color(136 / 255, 202 / 255, 151 / 255, 0.9);
            polygonAttributes.drawVerticals = polygon.extrude;
            polygonAttributes.applyLighting = true;
            polygon.attributes = polygonAttributes;

            buildingsLayer.addRenderable(polygon);
        });
    }
}

displayPoints()
displayBuildings()

guiNumOfPoints.onChange(value => {
    pointLayer.removeAllRenderables();
    getPointUrls(value)
    displayPoints()
})

guiBuildings.onChange(showBuildings => {
    buildingsLayer.removeAllRenderables();
    getBuildingUrl(showBuildings)
    displayBuildings()
})