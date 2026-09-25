'use client';
import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as MlMap, Marker } from 'maplibre-gl';
import type { RoutePoint } from '@/db/schema';

type VehiclePin={id:string;latitude:number;longitude:number;label?:string};
type PickupPin={id:string;latitude:number;longitude:number;label:string};
export default function ProductionMap({path,color='#ff5a47',vehicles=[],pickups=[],editable=false,onPathChange,className=''}:{path:RoutePoint[];color?:string;vehicles?:VehiclePin[];pickups?:PickupPin[];editable?:boolean;onPathChange?:(path:RoutePoint[])=>void;className?:string}){
  const el=useRef<HTMLDivElement>(null), map=useRef<MlMap|null>(null), markers=useRef<Marker[]>([]), pathRef=useRef(path);
  useEffect(()=>{pathRef.current=path},[path]);
  // MapLibre owns this imperative instance for the lifetime of the DOM node.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{if(!el.current||map.current)return;maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');const center=path[0]??{lng:107.6191,lat:-6.9175};const m=new maplibregl.Map({container:el.current,style:process.env.NEXT_PUBLIC_MAP_STYLE_URL||'https://tiles.openfreemap.org/styles/liberty',center:[center.lng,center.lat],zoom:13.2,attributionControl:{compact:true}});map.current=m;m.addControl(new maplibregl.NavigationControl({showCompass:true}),'bottom-right');m.addControl(new maplibregl.GeolocateControl({positionOptions:{enableHighAccuracy:true},trackUserLocation:true}),'bottom-right');m.on('load',()=>{m.addSource('route',{type:'geojson',data:line(pathRef.current)});m.addLayer({id:'route-shadow',type:'line',source:'route',paint:{'line-color':'#fff','line-width':12,'line-opacity':.9}});m.addLayer({id:'route',type:'line',source:'route',paint:{'line-color':color,'line-width':7}});});if(editable)m.on('click',e=>onPathChange?.([...pathRef.current,{lng:e.lngLat.lng,lat:e.lngLat.lat}]));return()=>{m.remove();map.current=null}},[]);
  useEffect(()=>{const m=map.current;if(!m?.isStyleLoaded())return;const source=m.getSource('route') as GeoJSONSource|undefined;source?.setData(line(path));const coords=path.map(p=>[p.lng,p.lat] as [number,number]);if(coords.length>1)m.fitBounds(coords.reduce((b,c)=>b.extend(c),new maplibregl.LngLatBounds(coords[0],coords[0])),{padding:90,maxZoom:14});},[path]);
  useEffect(()=>{markers.current.forEach(m=>m.remove());markers.current=[];if(!map.current)return;for(const v of vehicles){const node=document.createElement('div');node.className='live-vehicle-marker';node.textContent='🚌';node.title=v.label??v.id;markers.current.push(new maplibregl.Marker({element:node}).setLngLat([v.longitude,v.latitude]).addTo(map.current));}for(const p of pickups){const node=document.createElement('div');node.className='live-pickup-marker';node.textContent=p.label;markers.current.push(new maplibregl.Marker({element:node}).setLngLat([p.longitude,p.latitude]).addTo(map.current));}},[vehicles,pickups]);
  return <div ref={el} className={`h-full w-full ${className}`} aria-label="Peta angkutan umum interaktif"/>;
}
function line(path:RoutePoint[]){return {type:'Feature' as const,properties:{},geometry:{type:'LineString' as const,coordinates:path.map(p=>[p.lng,p.lat])}}}
