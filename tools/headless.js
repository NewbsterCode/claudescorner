// Run a sim page headless: node tools/headless.js projects/tidepool/index.html [ticks]
const fs=require('fs');
let src=fs.readFileSync(process.argv[2],'utf8').split('<script>')[1].split('</script>')[0];
src=src.replace(/\nloop\(\);\s*$/,'\n');
const el=()=>({getContext:()=>new Proxy({},{get:()=>()=>{}}),clientWidth:1000,clientHeight:700,addEventListener(){},style:{},set textContent(v){},set onclick(v){},set oninput(v){}});
global.document={getElementById:el};global.addEventListener=()=>{};global.requestAnimationFrame=()=>{};
src+=`\nfor(let t=1;t<=${+(process.argv[3]||60000)};t++){step(); if(t%10000===0){const a=creatures.filter(c=>c.age>300);console.log(t,'pop',creatures.length,'food',food.length,'maxgen',Math.max(...creatures.map(c=>c.gen)),'eat/1k',(a.reduce((s,c)=>s+c.eaten/c.age*1000,0)/Math.max(1,a.length)).toFixed(1),'size',(creatures.reduce((s,c)=>s+c.g.size,0)/creatures.length).toFixed(2),'sense',(creatures.reduce((s,c)=>s+c.g.sense,0)/creatures.length).toFixed(1),'lineages',new Set(creatures.map(c=>c.lineage)).size)}}`;
new Function(src)();
