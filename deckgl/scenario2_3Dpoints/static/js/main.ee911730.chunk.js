(this["webpackJsonp3DFlus-framework-benchmark"]=this["webpackJsonp3DFlus-framework-benchmark"]||[]).push([[0],{124:function(t,e){},127:function(t,e){},191:function(t,e){},194:function(t,e,a){"use strict";a.r(e);var n=a(4),o=a.n(n),r=a(149),s=a.n(r),i=a(14),c=a(9),p=a.n(c),u=a(17),l=a(2),f=a(3),d=a(11),m=a(12),h=a(211),b=a(217),j=a(156),y=a(215),g=a(151),k=a.n(g),v=a(212),x=a(16),O=a(152),w=a(77),_=new O.a,S={numOfPoints:"400 000"},D=_.add(S,"numOfPoints",["400 000","900 000","1 700 000"]).name("Number of points").listen(),P={longitude:120.81321,latitude:14.7569,zoom:10},z="pk.eyJ1IjoibWFyaWRhbmkiLCJhIjoiY2t2MHpjN281MWV0ZTJucXd5NTNhaHkwNSJ9.19TyMVuxbhR5NwITkfJSxA",J=("https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.png?access_token=".concat(z),"https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/los/32.json"),N="https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/los/142.json",T="https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/vertg/32.json",A="https://ptr.gisat.cz/ftpstorage/applications/3dflus/test_data/interferometry/vertg/142.json",M=function(t){switch(t){case"400 000":C=[N];break;case"900 000":C=[J,N];break;case"1 700 000":C=[J,N,T,A];break;default:C=[N]}},C=[];M(S.numOfPoints);var I=k.a.scale(["#fda34b","#ff7882","#c8699e","#7046aa","#0c1db8","#2eaaac"]).domain([-30,10]),W=function(t){Object(d.a)(a,t);var e=Object(m.a)(a);function a(){var t;Object(l.a)(this,a);for(var n=arguments.length,o=new Array(n),r=0;r<n;r++)o[r]=arguments[r];return(t=e.call.apply(e,[this].concat(o))).state={mapStyle:"mapbox://styles/mapbox/satellite-v9",jsonData:[]},t._loadPoints=function(){t._loadData().then((function(e){t.setState({jsonData:e})}))},t._loadData=Object(u.a)(p.a.mark((function t(){var e;return p.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return e=[],C.forEach((function(t){return e.push(new Promise((function(e,a){return e(Object(v.a)(t,y.a))})))})),t.abrupt("return",Promise.all(e).then((function(t){return t.flat()})));case 3:case"end":return t.stop()}}),t)}))),t}return Object(f.a)(a,[{key:"componentDidMount",value:function(){var t=this;D.onChange((function(e){t.setState({jsonData:[]}),M(e),t._loadPoints()})),this._loadPoints()}},{key:"componentWillUnmount",value:function(){_.destroy()}},{key:"render",value:function(){var t=[];return this.state.jsonData.length>0&&t.push(new b.a({id:"point-cloud-layer",data:this.state.jsonData,pickable:!1,coordinateSystem:x.a.LNGLAT,pointSize:2,getPosition:function(t){return[].concat(Object(i.a)(t.geometry.coordinates),[10+75*t.properties.h_cop30m])},getColor:function(t){return I(t.properties.vel_avg).rgb()}})),Object(w.jsx)("div",{children:Object(w.jsx)(h.a,{initialViewState:P,controller:!0,layers:t,children:Object(w.jsx)(j.a,{mapboxApiAccessToken:z,mapStyle:this.state.mapStyle})})})}}]),a}(n.Component);s.a.render(Object(w.jsx)(o.a.StrictMode,{children:Object(w.jsx)(W,{})}),document.getElementById("root"))}},[[194,1,2]]]);
//# sourceMappingURL=main.ee911730.chunk.js.map