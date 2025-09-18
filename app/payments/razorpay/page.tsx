// app/payments/razorpay/page.tsx
"use client";
import { useState } from "react";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function RazorpayCheckoutPage() {
  const [loading, setLoading] = useState(false);

  const startCheckout = async (amount: number, referrerId = "") => {
    setLoading(true);
    try {
      const token = localStorage.getItem("cp_token");
      if (!token) { alert("Please login to pay"); window.location.href = "/login"; return; }
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/payments/razorpay/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ amount, currency: "INR", referrerId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order creation failed");

      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Failed to load Razorpay script");

      const options: any = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY || "", // we will set this in frontend env
        amount: data.amount, // amount in paise
        currency: data.currency,
        name: "Career Platform",
        description: "Purchase plan",
        order_id: data.orderId,
        handler: function (response: any) {
          // You can show response. The webhook will also process payment
          alert("Payment successful! Razorpay payment id: " + response.razorpay_payment_id);
          window.location.href = "/payments/success";
        },
        modal: { ondismiss: function() { console.log("Checkout dismissed"); } },
        notes: {
          // Put owner info so webhook can credit transactions; server already has owner via auth, but adding notes helps
          ownerId: "", // leave blank; backend webhook reads notes if available
          referrerId: referrerId || ""
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      alert("Checkout error: " + (err.message || err));
      console.error(err);
    } finally { setLoading(false); }
  };

  return (
    <main style={{ padding:20 }}>
      <h2>Razorpay Checkout (Demo)</h2>
      <div style={{ display:"grid", gap:8, maxWidth:560 }}>
        <div className="card" style={{ padding:12 }}>
          <div style={{ fontWeight:800 }}>Employer Plan — ₹7,999 (example)</div>
          <div className="small">Demo amount; adjust price in create-order call (in rupees)</div>
          <button className="btn btn-primary" onClick={() => startCheckout(7999)}>Pay ₹7,999</button>
        </div>
        <div className="card" style={{ padding:12 }}>
          <div style={{ fontWeight:800 }}>Small Add-on — ₹2,499</div>
          <button className="btn" onClick={() => startCheckout(2499)}>Pay ₹2,499</button>
        </div>
      </div>
    </main>
  );
}
