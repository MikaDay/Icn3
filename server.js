const http=require("http"),fs=require("fs"),path=require("path"),{Pool}=require("pg");
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
const PW=process.env.APP_PASSWORD||"";
const page=fs.readFileSync(path.join(__dirname,"public","index.html"));
const send=(res,c,b,t)=>{res.writeHead(c,{"Content-Type":t||"application/json; charset=utf-8","Cache-Control":"no-store"});res.end(b)};
http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,"http://x");
  if(u.pathname==="/"||u.pathname==="/index.html")return send(res,200,page,"text/html; charset=utf-8");
  if(u.pathname==="/healthz")return send(res,200,"ok","text/plain");
  if(!u.pathname.startsWith("/api/tasks"))return send(res,404,"{}");
  if(PW&&req.headers["x-pass"]!==PW)return send(res,401,"{}");
  if(req.method==="GET"&&u.pathname==="/api/tasks"){
   const r=await pool.query("SELECT id,data FROM tasks");const o={};r.rows.forEach(x=>o[x.id]=x.data);return send(res,200,JSON.stringify(o));
  }
  const m=u.pathname.match(/^\/api\/tasks\/([A-Za-z0-9_-]{1,40})$/);
  if(req.method==="PUT"&&m){
   let b="";for await(const c of req){b+=c;if(b.length>20000)return send(res,413,"{}")}
   const d=JSON.parse(b);
   await pool.query("INSERT INTO tasks(id,data) VALUES($1,$2) ON CONFLICT (id) DO UPDATE SET data=$2",[m[1],d]);
   return send(res,200,"{}");
  }
  send(res,404,"{}");
 }catch(e){console.error(e);send(res,500,"{}")}
}).listen(process.env.PORT||3000,async()=>{
 await pool.query("CREATE TABLE IF NOT EXISTS tasks(id text PRIMARY KEY,data jsonb NOT NULL)");
 console.log("up");
});
