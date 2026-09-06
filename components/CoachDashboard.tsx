"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import SectionLabel from "@/components/ui/SectionLabel";

// Section « dashboard » de la landing : le VRAI dashboard, pas une maquette.
// Captures de /exemple/dashboard (le produit qui tourne) dans un cadre
// MacBook et un iPhone : dès qu'un écran change, on recapture, la landing
// ne peut plus mentir sur l'état du produit. Sur mobile, l'iPhone seul.

export default function CoachDashboard() {
  return (
    <section className="relative overflow-hidden py-20 md:py-24">
      {/* Ambiance */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 70% 50% at 50% 55%, rgba(203,255,3,0.05), transparent 70%)" }}
      />

      <div id="dashboard" className="mx-auto max-w-6xl px-5 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="mb-12 flex flex-col items-center text-center"
        >
          <SectionLabel>Dashboard coach</SectionLabel>
          <h2
            className="mb-4 font-extrabold text-white"
            style={{ fontSize: "clamp(28px, 4.5vw, 52px)", letterSpacing: "-0.035em", lineHeight: 1.06 }}
          >
            Ta journée est pleine.<br />
            <span style={{
              background: "linear-gradient(90deg, #CBFF03, #a8e600)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>Ton admin, lui, est déjà fait.</span>
          </h2>
          <p className="mx-auto max-w-lg text-lg text-text-muted" style={{ lineHeight: 1.6 }}>
            Réservations, paiements, clients, factures : tout tourne pendant que tu coaches.
          </p>
        </motion.div>

        {/* ── Desktop : MacBook + iPhone en surimpression ── */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative hidden md:block"
        >
          <div className="mx-auto max-w-4xl">
            {/* Capot */}
            <div
              className="rounded-t-[22px] p-[4px] pb-0"
              style={{ background: "linear-gradient(180deg,#3a3a3c,#232325)", boxShadow: "0 40px 100px rgba(0,0,0,0.6), 0 0 60px rgba(203,255,3,0.06)" }}
            >
              <div className="relative rounded-t-[19px] bg-black px-5 pt-5">
                {/* Encoche caméra */}
                <div className="absolute left-1/2 top-0 z-10 h-5 w-36 -translate-x-1/2 rounded-b-xl bg-black">
                  <span className="absolute left-1/2 top-1.5 h-2 w-2 -translate-x-1/2 rounded-full border border-[#1f1f1f] bg-[#111]" />
                </div>
                <div className="overflow-hidden rounded-t-md bg-[#141414]">
                  {/* Barre de navigateur */}
                  <div className="flex items-center gap-2 border-b border-white/[0.06] bg-[#1A1A1A] px-4 py-2.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#FF5F57" }} />
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#FFBD2E" }} />
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#28C840" }} />
                    <span className="ml-3 flex-1 rounded-full border border-white/[0.08] bg-[#0F0F0F] px-3 py-1 text-[11px] text-[#8A8A8A]">
                      madger.app
                    </span>
                  </div>
                  <Image
                    src="/landing/dashboard-desktop.png"
                    alt="Le dashboard Madger : revenus du mois, séances, clients, note et prochaines séances"
                    width={1440}
                    height={900}
                    sizes="(max-width: 1024px) 90vw, 896px"
                    className="block w-full"
                  />
                </div>
              </div>
            </div>
            {/* Châssis */}
            <div className="relative mx-auto h-[18px] w-[118%] max-w-none -translate-x-[7.6%] rounded-b-2xl" style={{ background: "linear-gradient(180deg,#4a4a4d,#2b2b2d 45%,#171718)" }}>
              <span className="absolute left-1/2 top-0 h-2 w-36 -translate-x-1/2 rounded-b-lg" style={{ background: "linear-gradient(180deg,#1b1b1c,#2f2f31)" }} />
            </div>
          </div>

          {/* iPhone en surimpression : la même app, dans la poche */}
          <div className="absolute -bottom-6 right-0 hidden w-[190px] lg:block xl:right-6">
            <div
              className="rounded-[34px] p-[3px]"
              style={{ background: "linear-gradient(145deg,#3d3d40,#1c1c1e 40%,#0c0c0d 70%,#2a2a2c)", boxShadow: "0 30px 70px rgba(0,0,0,0.8)" }}
            >
              <div className="rounded-[31px] bg-black p-[7px]">
                <div className="overflow-hidden rounded-[25px] bg-[#0A0A0A]">
                  <Image
                    src="/landing/dashboard-mobile.png"
                    alt="Le dashboard Madger sur mobile, avec sa navigation"
                    width={1179}
                    height={2556}
                    sizes="190px"
                    className="block w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Mobile : l'iPhone seul, plein cadre ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-[320px] md:hidden"
        >
          <div
            className="rounded-[52px] p-[4px]"
            style={{ background: "linear-gradient(145deg,#3d3d40,#1c1c1e 40%,#0c0c0d 70%,#2a2a2c)", boxShadow: "0 40px 90px rgba(0,0,0,0.8), 0 0 60px rgba(203,255,3,0.08)" }}
          >
            <div className="rounded-[48px] bg-black p-[10px]">
              <div className="overflow-hidden rounded-[38px] bg-[#0A0A0A]">
                <Image
                  src="/landing/dashboard-mobile.png"
                  alt="Le dashboard Madger sur mobile : revenus, séances, clients, navigation"
                  width={1179}
                  height={2556}
                  sizes="320px"
                  className="block w-full"
                  priority={false}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
