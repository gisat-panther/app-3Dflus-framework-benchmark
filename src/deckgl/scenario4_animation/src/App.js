import React, {Component} from "react";
import DeckGL from "@deck.gl/react";
import {PointCloudLayer} from "@deck.gl/layers";
import {StaticMap} from "react-map-gl";
import {JSONLoader} from "@loaders.gl/json";
import chroma from "chroma-js";
import {load} from "@loaders.gl/core";
import {COORDINATE_SYSTEM} from "@deck.gl/core";
import arrayShuffle from "array-shuffle";
import * as dat from "dat.gui";
import {ANIMATION_URLS} from "./animation_urls"

// ---- GUI definition - start
const gui = new dat.GUI();
const settings = {
    animationType: "real data 1 000"
}
let guiAnimType = gui.add(settings, "animationType", ["real data 1 000", "random data 10 000", "random data 100 000", "random data 400 000"]).name("Animation type").listen();
// ---- GUI definition - end

let animation_type = settings.animationType;
let random_animated_points_count = 100000;

const INITIAL_VIEW_STATE = {
    longitude: 120.81321,
    latitude: 14.7569,
    zoom: 10,
};

//animation constants
const FRAME_MIN_TIME = 100;
let lastFrameTime = 0;
let frameCount = 1000;
let currentFrame = 0;
let timelineDates = [];

const setAnimationType = (value) => {
    animation_type = value;
    if (value === "random data 10 000") {
        random_animated_points_count = 10000;
    } else if (value === "random data 100 000") {
        random_animated_points_count = 100000;
    } else if (value === "random data 400 000") {
        random_animated_points_count = 400000;
    }
}

const MAPBOX_ACCESS_TOKEN =
    "pk.eyJ1IjoibWFyaWRhbmkiLCJhIjoiSGF2TGdwZyJ9.B0N8ybRGG38wmRK_VfxPoA";

const POINT_URLS = ["https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/los/32.json"];

let colorScale = chroma
    .scale(["#fda34b", "#ff7882", "#c8699e", "#7046aa", "#0c1db8", "#2eaaac"])
    .domain([-30, 10]);

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default class App extends Component {
    state = {
        jsonData: [],
        animatedData: [],
        mapStyle: 'mapbox://styles/mapbox/satellite-v9',
    };

    componentDidMount() {
        guiAnimType.onChange(value => {
            this.setState({jsonData: [], animatedData: []});
            setAnimationType(value)
            this._loadAnimatedData()
        })
        this._loadAnimatedData()
    }

    componentWillUnmount() {
        gui.destroy()
    }

    _loadAnimatedData = () => {
        if (animation_type === "real data 1 000") {
            this._loadData(ANIMATION_URLS).then((animatedData) => {
                this.setState({animatedData})
                this._createTimeArrays();
                window.requestAnimationFrame(this._animate);
            });

        } else {
            this._loadData(POINT_URLS).then((data) => {
                this.setState({jsonData: data});
                let animatedData = (arrayShuffle(data)).slice(0, random_animated_points_count)
                animatedData.forEach((value, index) => {
                    animatedData[index].modified_height = value.properties.h_cop30m + 50000
                })
                this.setState({animatedData})
                window.requestAnimationFrame(this._animate);
            });
        }
    }

    _createTimeArrays = () => {
        let animatedData = this.state.animatedData;
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
            animatedData[index].modified_height = item.properties.h_cop30m + 50000;
        });
        this.setState({animatedData});
    };


    _animate = (time) => {
        if (time - lastFrameTime < FRAME_MIN_TIME) {
            window.requestAnimationFrame(this._animate);
            return;
        }

        lastFrameTime = time;

        if (currentFrame < frameCount) currentFrame++;
        else currentFrame = 0;

        let animatedData = [...this.state.animatedData];
        animatedData.forEach((item, index) => {
            if (currentFrame === 0) {
                animatedData[index].modified_height = item.properties.h_cop30m + 50000;
            }
            if (animation_type === "real data 1 000") {
                animatedData[index].modified_height =
                    item.modified_height + item.d_timeline[currentFrame];
            } else {
                animatedData[index].modified_height =
                    item.modified_height + getRandomInt(-2000, 2000)
            }
        });

        this.setState({animatedData});
        window.requestAnimationFrame(this._animate);
    };

    _loadData = async (urls) => {
        let promisedData = [];
        urls.forEach((url) =>
            promisedData.push(
                new Promise((resolve, reject) => resolve(load(url, JSONLoader)))
            )
        );
        return Promise.all(promisedData).then((values) => values.flat());
    };

    render() {
        let layers = [];

        if (this.state.animatedData.length > 0) {
            layers.push(
                new PointCloudLayer({
                    id: "animated-layer",
                    data: this.state.animatedData,
                    pickable: false,
                    coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
                    pointSize: animation_type === "real data 1 000" ? 6 : 1,
                    getPosition: (d) => [...d.geometry.coordinates, d.modified_height],
                    getColor: (d) => colorScale(d.properties.vel_avg).rgb(),
                })
            );
        }

        return (
            <div>
                <DeckGL
                    initialViewState={INITIAL_VIEW_STATE}
                    controller={true}
                    layers={layers}
                >
                    <StaticMap
                        mapboxApiAccessToken={MAPBOX_ACCESS_TOKEN}
                        mapStyle={this.state.mapStyle}/>
                </DeckGL>
            </div>
        );
    }
}
