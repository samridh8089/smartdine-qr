import{g as i,s as g}from"./gas-Czq9IFUy.js";let r=localStorage.getItem("waiter_rid");const s=document.getElementById("bellSound");let d=new Set;r&&(document.getElementById("loginForm").classList.add("hidden"),document.getElementById("startOverlay").classList.remove("hidden"));window.startDisplay=()=>{document.getElementById("startOverlay").classList.add("hidden"),s.play().then(()=>{s.pause(),s.currentTime=0}).catch(()=>{}),c()};window.login=async()=>{const n=document.getElementById("wRid").value,a=document.getElementById("wPass").value,t=document.querySelector("#loginForm button");t.innerText="Loading...";const e=await i("loginStaff",{restaurantId:n,username:"waiter",password:a});e.success&&e.role==="Waiter"?(localStorage.setItem("waiter_rid",n),r=n,s.play().then(()=>{s.pause(),s.currentTime=0}).catch(()=>{}),c()):(document.getElementById("loginMsg").innerText="Invalid credentials",t.innerText="Login")};window.logout=()=>{localStorage.removeItem("waiter_rid"),window.location.reload()};function c(){document.getElementById("loginForm").classList.add("hidden"),document.getElementById("mainDisplay").classList.remove("hidden"),g(o,2e3)}async function o(){if(!r)return;document.getElementById("loading").classList.remove("hidden");const[n,a]=await Promise.all([i("getWaiterCalls",{restaurantId:r}),i("getOrders",{restaurantId:r,status:"All"})]);document.getElementById("loading").classList.add("hidden");let t=[];if(n.success&&(t=t.concat(n.data.map(e=>({...e,alertType:"Call"})))),a.success){const e=a.data.filter(l=>l.Status==="Ready"||l.Status==="Preparing");t=t.concat(e.map(l=>({...l,alertType:"Order"})))}u(t),m(t)}function m(n){const a=n.map(e=>e.CallID||e.OrderID);a.some(e=>!d.has(e))&&(a.forEach(e=>d.add(e)),s.play().catch(e=>{})),d.forEach(e=>{a.includes(e)||d.delete(e)})}function u(n){const a=document.getElementById("alertsContainer");if(document.getElementById("alertCount").innerText=n.length,n.length===0){a.innerHTML=`
          <div style="text-align:center; padding: 4rem 1rem; opacity:0.5;">
            <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin:0 auto 1rem; display:block;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 13l4 4L19 7"></path></svg>
            <p style="font-size:1.1rem;">All caught up!</p>
            <p style="font-size:0.9rem;">No active requests right now.</p>
          </div>
        `;return}a.innerHTML=n.map(t=>{if(t.alertType==="Call"){let e=t.Type==="Bill";return`
            <div class="glass-card slide-in-right" style="padding:1rem; border-left: 4px solid ${e?"var(--danger)":"var(--warning)"}; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <h3 style="margin:0; font-size:1.3rem;">Table ${t.TableNo}</h3>
                <p class="text-secondary" style="font-size:0.9rem; margin-top:0.25rem;">
                  <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${e?"var(--danger)":"var(--warning)"}; margin-right:4px;"></span>
                  ${e?"Requested the Bill":"Needs a Waiter"}
                </p>
              </div>
              <button class="btn-primary" style="background:${e?"var(--danger)":"var(--warning)"}; padding: 0.75rem 1.25rem;" onclick="resolveCall('${t.CallID}')">
                Done
              </button>
            </div>
          `}else return t.Status==="Preparing"?`
              <div class="glass-card slide-in-right" style="padding:1rem; border-left: 4px solid var(--accent-primary); opacity:0.7;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <h3 style="margin:0; font-size:1.3rem;">Table ${t.TableNo}</h3>
                    <p class="text-secondary" style="font-size:0.9rem; margin-top:0.25rem;">Kitchen is Preparing</p>
                  </div>
                  <span class="badge badge-cooking" style="background:transparent;">Wait</span>
                </div>
              </div>
            `:`
              <div class="glass-card slide-in-right" style="padding:1rem; border-left: 4px solid var(--success); display:flex; justify-content:space-between; align-items:center; background: linear-gradient(90deg, rgba(16,185,129,0.1) 0%, transparent 100%);">
                <div>
                  <h3 style="margin:0; font-size:1.3rem; color:var(--success);">Table ${t.TableNo}</h3>
                  <p class="text-secondary" style="font-size:0.9rem; margin-top:0.25rem;">Food is Ready</p>
                </div>
                <button class="btn-success" style="padding: 0.75rem 1.25rem;" onclick="deliverOrder('${t.OrderID}')">
                  Deliver
                </button>
              </div>
            `}).join("")}window.resolveCall=async n=>{await i("updateWaiterCall",{restaurantId:r,callId:n,status:"Resolved"}),o()};window.deliverOrder=async n=>{await i("updateOrder",{restaurantId:r,orderId:n,status:"Delivered"}),o()};
