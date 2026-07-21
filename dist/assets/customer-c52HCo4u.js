import{g as d,s as w,a as x}from"./gas-Czq9IFUy.js";const f=new URLSearchParams(window.location.search),r=f.get("restaurantId"),l=f.get("tableNo");!r||!l?document.body.innerHTML=`
        <div style="height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:2rem;">
          <h2 style="color:var(--danger); margin-bottom:1rem;">Invalid QR Code</h2>
          <p class="text-secondary">Please scan a valid table QR code to view the menu.</p>
        </div>
      `:(document.getElementById("tableDisplay").innerText=l,L());let c=[],a={},u=null,v=null;function o(e,n=!1){const t=document.getElementById("toast");t.innerText=e,n?t.classList.add("error"):t.classList.remove("error"),t.classList.add("show"),setTimeout(()=>t.classList.remove("show"),3e3)}async function L(){const e=`menu_${r}`,n=sessionStorage.getItem(e);if(n){const s=JSON.parse(n);if(Date.now()-s.timestamp<6e4){p(s.res);return}}const t=await d("getMenu",{restaurantId:r});t.success?(sessionStorage.setItem(e,JSON.stringify({timestamp:Date.now(),res:t})),p(t)):(document.getElementById("loading").classList.add("hidden"),o("Error loading menu",!0))}function p(e){document.getElementById("loading").classList.add("hidden"),c=e.menu.filter(n=>n.Available===!0||String(n.Available).toLowerCase()==="true"),T(e.categories),h("All")}function T(e){const n=document.getElementById("categoryContainer");n.classList.remove("hidden");let t=`<button class="cat-btn active" onclick="filterMenu('All', this)">All</button>`;e.filter(s=>s.Active===!0||String(s.Active).toLowerCase()==="true").forEach(s=>{t+=`<button class="cat-btn" onclick="filterMenu('${s.Name}', this)">${s.Name}</button>`}),n.innerHTML=t}window.filterMenu=(e,n)=>{document.querySelectorAll(".cat-btn").forEach(t=>t.classList.remove("active")),n.classList.add("active"),h(e)};function h(e){const n=document.getElementById("menuContainer");let t=c;e!=="All"&&(t=c.filter(s=>s.Category===e)),n.innerHTML=t.map(s=>`
        <div class="menu-item fade-in">
          <img src="${s.ImageURL||"https://via.placeholder.com/80?text=No+Image"}" alt="${s.Name}" onerror="this.src='https://via.placeholder.com/80?text=No+Image'">
          <div class="menu-item-info">
            <div>
              <h3 style="margin-bottom: 0.25rem; font-size:1.1rem;">${s.Name}</h3>
              <p class="text-secondary" style="font-size: 0.85rem; line-height:1.4; margin-bottom: 0.5rem; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${s.Description||"Delicious prepared fresh."}</p>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top:0.5rem;">
              <strong style="font-size:1.1rem; color:var(--text-primary);">₹${parseFloat(s.Price).toFixed(2)}</strong>
              <button class="btn-primary" style="padding: 0.4rem 1.25rem; border-radius:99px; font-size:0.9rem;" onclick="addToCart('${s.ID}')">Add</button>
            </div>
          </div>
        </div>
      `).join("")}window.addToCart=e=>{const n=c.find(t=>t.ID===e);a[e]?a[e].qty++:a[e]={...n,qty:1},y()};window.updateQty=(e,n)=>{a[e]&&(a[e].qty+=n,a[e].qty<=0&&delete a[e],y(),I())};function y(){let e=0,n=0;Object.values(a).forEach(s=>{e+=s.qty,n+=s.Price*s.qty}),document.getElementById("cartCount").innerText=e,document.getElementById("cartTotal").innerText=n.toFixed(2),document.getElementById("cartModalTotal").innerText=n.toFixed(2);const t=document.getElementById("cartPill");e>0?t.classList.remove("hidden"):(t.classList.add("hidden"),hideCart())}window.showCart=()=>{if(Object.keys(a).length===0)return o("Cart is empty",!0);I(),document.getElementById("cartModal").classList.remove("hidden")};window.hideCart=()=>{document.getElementById("cartModal").classList.add("hidden")};function I(){const e=document.getElementById("cartItems");if(Object.keys(a).length===0){hideCart();return}e.innerHTML=Object.values(a).map(n=>`
        <div class="cart-item fade-in">
          <div>
            <h4 style="margin:0; font-size:1.1rem;">${n.Name}</h4>
            <div class="text-secondary mt-1" style="font-size:0.9rem;">₹${parseFloat(n.Price).toFixed(2)}</div>
          </div>
          <div class="qty-control">
            <button class="qty-btn" onclick="updateQty('${n.ID}', -1)">-</button>
            <span style="font-weight:600; width:16px; text-align:center;">${n.qty}</span>
            <button class="qty-btn" onclick="updateQty('${n.ID}', 1)">+</button>
          </div>
        </div>
      `).join("")}window.placeOrder=async()=>{const e=document.getElementById("confirmOrderBtn"),n=e.innerHTML;e.innerHTML="<span>Processing...</span>",e.disabled=!0;const t=Object.values(a).map(i=>({id:i.ID,name:i.Name,price:i.Price,qty:i.qty})),s=t.reduce((i,g)=>i+g.price*g.qty,0),b=document.getElementById("specialInstructions").value,m=await d("addOrder",{restaurantId:r,tableNo:l,items:t,total:s,specialInstructions:b});m.success?(u=m.orderId,hideCart(),a={},y(),o("Order placed successfully!"),E(t,s)):(o("Failed to place order: "+m.message,!0),e.innerHTML=n,e.disabled=!1)};function E(e,n){document.getElementById("statusModal").classList.remove("hidden"),document.getElementById("displayOrderId").innerText=u,document.getElementById("displayOrderTotal").innerText=n.toFixed(2),document.getElementById("orderedItemsList").innerHTML=e.map(t=>`
        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
          <span>${t.qty}x ${t.name}</span>
          <span>₹${(t.price*t.qty).toFixed(2)}</span>
        </div>
      `).join(""),v=w(B,3e3)}async function B(){if(!u)return;const e=await d("getOrders",{restaurantId:r,status:"All"});if(e.success&&e.data){const n=e.data.find(t=>t.OrderID===u);if(n){const t=document.getElementById("orderStatusText"),s=document.querySelector("#statusModal .loader");n.Status==="Cooking"?(t.innerText="Cooking...",t.style.color="var(--warning)"):n.Status==="Ready"?(t.innerText="Food is Ready!",t.style.color="var(--success)",s.style.borderTopColor="var(--success)"):n.Status==="Delivered"&&(t.innerText="Enjoy your meal!",t.style.color="var(--success)",s.classList.add("hidden"),x(v))}}}window.callWaiter=async()=>{o("Waiter called."),await d("callWaiter",{restaurantId:r,tableNo:l})};window.requestBill=async()=>{o("Bill requested."),await d("requestBill",{restaurantId:r,tableNo:l})};
