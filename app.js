const FALLBACK={lat:10.0879,lon:-84.4705};
let pos=FALLBACK, weather=null, map=null, marker=null, rainLayer=null, satLayer=null;

const $=id=>document.getElementById(id);
const emoji=c=>c===0?"☀️":[1,2].includes(c)?"🌤️":c===3?"☁️":[45,48].includes(c)?"🌫️":[51,53,55,56,57].includes(c)?"🌦️":[61,63,65,66,67,80,81,82].includes(c)?"🌧️":[95,96,99].includes(c)?"⛈️":"🌡️";
const desc=c=>c===0?"Despejado":[1,2].includes(c)?"Parcialmente nublado":c===3?"Nublado":[45,48].includes(c)?"Niebla":[51,53,55,56,57].includes(c)?"Llovizna":[61,63,65,80,81,82].includes(c)?"Lluvia":[95,96,99].includes(c)?"Tormenta":"Condiciones variables";

async function loadWeather(){
  const url=`https://api.open-meteo.com/v1/forecast?latitude=${pos.lat}&longitude=${pos.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,uv_index_max&forecast_days=7&timezone=auto`;
  try{
    const r=await fetch(url); weather=await r.json(); render();
  }catch(e){$("condition").textContent="No se pudo actualizar";$("rainText").textContent="Comprueba tu conexión a Internet."}
}
function render(){
  const c=weather.current,d=weather.daily,h=weather.hourly;
  $("temp").textContent=Math.round(c.temperature_2m)+"°";
  $("condition").textContent=emoji(c.weather_code)+" "+desc(c.weather_code);
  $("feels").textContent="Sensación "+Math.round(c.apparent_temperature)+"°C";
  $("humidity").textContent=c.relative_humidity_2m;
  $("wind").textContent=Math.round(c.wind_speed_10m);
  $("uv").textContent=d.uv_index_max[0];
  const probs=h.precipitation_probability.slice(0,24);
  const max=Math.max(...probs);
  const idx=probs.findIndex(x=>x>=60);
  $("rainMax").textContent=max;$("rainBar").style.width=max+"%";
  $("rainText").textContent=idx>=0?"Probabilidad alta alrededor de las "+h.time[idx].slice(11,16)+".":"No se detecta probabilidad alta durante las próximas horas.";
  $("hours").innerHTML=h.time.slice(0,24).map((t,i)=>`<div class="hour"><b>${t.slice(11,16)}</b><strong>${emoji(h.weather_code[i])}</strong><span>${Math.round(h.temperature_2m[i])}°</span><small>🌧️ ${h.precipitation_probability[i]}%</small></div>`).join("");
  $("days").innerHTML=d.time.map((date,i)=>`<div class="day"><div><b>${date}</b><small>${desc(d.weather_code[i])}</small></div><span>${emoji(d.weather_code[i])}</span><b>${Math.round(d.temperature_2m_max[i])}° / ${Math.round(d.temperature_2m_min[i])}°</b><small>🌧️ ${d.precipitation_probability_max[i]}%</small></div>`).join("");
  if(map){map.setView([pos.lat,pos.lon],10);marker.setLatLng([pos.lat,pos.lon]);}
}
function initMap(){
  if(map)return;
  map=L.map("map").setView([pos.lat,pos.lon],10);
  const base=L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap contributors"}).addTo(map);
  marker=L.marker([pos.lat,pos.lon]).addTo(map).bindPopup("📍 Tu ubicación");
  // RainViewer latest public radar frame is fetched dynamically.
  fetch("https://api.rainviewer.com/public/weather-maps.json").then(r=>r.json()).then(data=>{
    const past=data.radar?.past||[];
    if(past.length){
      const f=past[past.length-1];
      rainLayer=L.tileLayer(data.host+f.path+"/256/{z}/{x}/{y}/2/1_1.png",{opacity:.65,tileSize:256,maxZoom:10});
    }
  }).catch(()=>{});
  satLayer=L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{attribution:"Tiles © Esri"})
  window.mapBase=base;
}
function setLayer(type){
  if(!map)return;
  [rainLayer,satLayer].forEach(x=>{if(x&&map.hasLayer(x))map.removeLayer(x)});
  if(type==="rain"&&rainLayer)rainLayer.addTo(map);
  // A true satellite provider can be added later without changing the UI.
}
$("homeBtn").onclick=()=>{$("home").classList.remove("hidden");$("mapPage").classList.add("hidden");$("homeBtn").classList.add("selected");$("mapBtn").classList.remove("selected")};
$("mapBtn").onclick=()=>{$("home").classList.add("hidden");$("mapPage").classList.remove("hidden");$("mapBtn").classList.add("selected");$("homeBtn").classList.remove("selected");setTimeout(()=>{initMap();map.invalidateSize()},100)};
$("refresh").onclick=()=>loadWeather();
document.querySelectorAll(".layers button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".layers button").forEach(x=>x.classList.remove("active"));b.classList.add("active");setLayer(b.dataset.layer)});

if(navigator.geolocation){
 navigator.geolocation.getCurrentPosition(p=>{pos={lat:p.coords.latitude,lon:p.coords.longitude};loadWeather()},()=>loadWeather(),{enableHighAccuracy:true,timeout:8000});
}else loadWeather();
