"use strict";

//sets the map size to its maximum (in relation to window height and width) and the size of other elements
function setLayout() {
    let wh = window.innerHeight;
    let ww = window.innerWidth;
    const MAP = document.getElementById("map");
    const SIDEBAR = document.getElementById("sidebar");
    const TITLE = document.getElementById("title");
    const TIMETABLE = document.getElementById("routeInfo");
    const CLEAR = document.getElementById("clear");
    const CONTROLS = document.getElementById("animationControl");
    const TIME_SLIDER = document.getElementById("timeSlider");
    
    let scale = ((ww - 800)/800 >= (wh - 752)/752) ? wh/752 : ww/800;

    MAP.style.height = (scale*752-8) + "px";
    MAP.style.width = (scale*800-8) + "px";
    SIDEBAR.style.maxWidth = (scale*800-8) + "px";
    
    CLEAR.style.height = CONTROLS.clientHeight + "px";
    TIMETABLE.style.maxHeight = (wh - CONTROLS.clientHeight - TITLE.clientHeight - 30) + "px";
    TIME_SLIDER.style.width = (SIDEBAR.offsetWidth-70) + "px";
}

//creates a map sign for each route and sets it to its first station
function createBusSigns() {
    const SVG_BUSES = document.getElementById("buses");
    for (let route of routes) {
        let busSign = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        busSign.setAttribute("id", route.sign);
        busSign.setAttribute("r", "2.5")
        busSign.setAttribute("cx", document.getElementById(route.stops[0]).getAttribute("cx"));
        busSign.setAttribute("cy", document.getElementById(route.stops[0]).getAttribute("cy"));
        busSign.setAttribute("cursor", "pointer");
        busSign.addEventListener("click", function() {exportRouteInfo(event)});
        SVG_BUSES.appendChild(busSign);
    }
}

//export route's timetable
function exportRouteInfo(event) {
    const OUTPUT = document.getElementById("routeInfo");
    const BUS_ID = event.target.attributes.id.value;
    for (let route of routes) {
        //find the corresponding bus (route)
        if (route.sign === BUS_ID) {

            let i = 0;
            let direction = 1;
            
            //check if the bus is not on its route back
            if (time < 1000*(route.endstation+route.delay)) {
                OUTPUT.innerHTML = "<h2>Linka " + route.name.slice(0,3) + "</h2><h2>Ze směru : " + route.from + "</h2><h2>Směr : " + route.to + "</h2>";
            }
            else {
                OUTPUT.innerHTML = "<h2>Linka " + route.name.slice(0,3) + "</h2><h2>Ze směru: " + route.to + "</h2><h2>Směr: " + route.from + "</h2>";
                i = route.deps.findIndex(n => n == route.endstation) + 1;
                direction = -1;
            }
            
            //add stops to the timetable
            const TIMETABLE = document.createElement("table");
            OUTPUT.appendChild(TIMETABLE);
            while (route.stops[i] != route.stops[i-(direction*1)] || route.stops[i] == "U1146N153" || route.stops[i] == "U1472N1225") {
                const TIME = route.deps[i];
                const STOP = document.getElementById(route.stops[i]).getAttribute("data-name");
                const TABLE_ROW = document.createElement("tr");
                TABLE_ROW.innerHTML = "<th style='font-weight:normal'>0" + Math.floor(TIME/60) + ":" + ("0" + Math.floor((TIME-Math.floor(TIME/60)*60))).slice(-2) + "</th><th style='font-weight:normal'>" + STOP + "</th>";
                TIMETABLE.appendChild(TABLE_ROW);
                i++;
            }
            break;
        }
    }
}

//global variables needed
let time = 0;
let pace = 1;
let animation;
let paused = false;

//starts animation if stopped
function startAnimating() {
    clearInterval(animation)
    animation = setInterval(chronos, 1000/24);
}

//sets pace if set by the user
function setPace(event) {
    const NEW_PACE = event.target.name.toString();
    pace = NEW_PACE;
}

//pauses the animation
function pauseOrPlay() {
    const PAUSE = document.querySelectorAll(".pause");
    
    if (paused) {
        paused = false;
        document.getElementById("play").setAttribute("fill", "none");
        for (let i=0; i<PAUSE.length; i++) {
            PAUSE[i].setAttribute("fill", "#000000");
        }
        startAnimating()
    }
    else {
        paused = true;
        document.getElementById("play").setAttribute("fill", "#000000");
        for (let i=0; i<PAUSE.length; i++) {
            PAUSE[i].setAttribute("fill", "none");
        }
        clearInterval(animation);
    }
}

// if not paused, stops the animation when timeslider dragged and starts it from its new position
function moveInTime() {
    if (!paused) {
        clearInterval(animation);
    }
    const TIME_SLIDER = document.getElementById("timeSlider");
    time = parseInt(TIME_SLIDER.value);
    const CLOCK = document.getElementById("clock");
    CLOCK.innerText = "0" + Math.floor(time/60000) + ":" + ("0" + Math.floor((time-Math.floor(time/60000)*60000)/1000)).slice(-2);
    
    //draw each route
    for (let route of routes) {
        animate(route);
    }
    
    if (!paused) {
        startAnimating();
    }
}

function chronos() {
    //counts the time (miliseconds) and visualizes it in animation controls
    time += pace*1000/60;
    const TIME_SLIDER = document.getElementById("timeSlider");
    TIME_SLIDER.value = time.toString();
    const CLOCK = document.getElementById("clock");
    CLOCK.innerText = "0" + Math.floor(time/60000) + ":" + ("0" + Math.floor((time-Math.floor(time/60000)*60000)/1000)).slice(-2);
                                                            
    //draw each route
    for (let route of routes) {
        animate(route);
    }
    
    //loop in the end of the animation
    if (time >= 60000) {
        clearInterval(animation)
        setTimeout(function() {time = 0;startAnimating()},5000);
    }
}

//main function, counts object position at given time a draws it
function animate(route) {
    //finds out the position of next stop
    let index = Math.max(1, route.deps.findIndex(n => 1000*(n+route.delay) >= time));
        //if clausule checks time interval
        if (index > -1 && time > route.delay*1000) {
            let time2 = 1000*(route.deps[index]+route.delay);
            let time1 = 1000*(route.deps[index-1]+route.delay);
            let stop2 = route.stops[index];
            let stop1 = route.stops[index-1];
            
            // the SVG path for this route
            let path = document.getElementById(route.name);
            
            // lenght of the subpaths from beginning to next and last stop
            let subpath2 = getSubPathLength(route,path,stop2);
            let subpath1 = getSubPathLength(route,path,stop1);
            let sectLength = subpath2 - subpath1;

            //counts actual position on the path (easing in out quadratic)
            let actPosition = ((time-time1)/(time2-time1) < 0.5) ? ((sectLength)*2*(time-time1)/(time2-time1)*(time-time1)/(time2-time1) + subpath1) : sectLength*(-1+(2*(2-(time-time1)/(time2-time1))*(time-time1)/(time2-time1))) + subpath1;
            
            //counts actual position on the path (linear)
            //let actPosition = path.getPointAtLength(subpath1+sectLength*(time-time1)/(time2-time1))

            let newX = path.getPointAtLength(actPosition).x;
            let newY = path.getPointAtLength(actPosition).y;

            //sets new center of corresponding map sign
            const SIGN = document.getElementById(route.sign);
            SIGN.setAttribute("cx", newX);
            SIGN.setAttribute("cy", newY);
}
}

//counts the lenght from beginning of a path to its specific vertex
function getSubPathLength(route, path, stop) {
    // map position of the stop
    let sectEndX = document.getElementById(stop).attributes.cx.value;
    let sectEndY = document.getElementById(stop).attributes.cy.value;
    
    //the vertex to look for
    let begin
    
    //detects Edge browser which rewrites the path definitions (deletes commas)
    if (/Edge/.test(navigator.userAgent)) {
        begin = "" + sectEndX + " " + sectEndY;
    }
    else {
        begin = "" + sectEndX + "," + sectEndY;
    }
    
    // the original path definition
    let original = path.attributes.d.value;
    
    //returns index of the vertex in the original path definition string (deals also with loops on the route)
    let endIndex = (route.loop[0] && time >= 1000*route.loop[1] && time <= 1000*route.loop[2] ) ? original.lastIndexOf(begin) + begin.length : original.indexOf(begin) + begin.length
    
    //creates a new subpath from beginning to the specified vertex
    let subpath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    subpath.setAttribute("d", original.substring(0, endIndex));
    
    ///returns length of the created subpath
    return subpath.getTotalLength();
}

window.addEventListener("load", createBusSigns);
window.addEventListener("load", setLayout);
window.addEventListener("load", startAnimating);
window.addEventListener("resize", setLayout);