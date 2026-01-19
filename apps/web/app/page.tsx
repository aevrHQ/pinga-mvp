"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  Github,
  Bell,
  Shield,
  Zap,
  CheckCircle2,
  Terminal,
  Server,
  MessageCircle,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-black selection:bg-gray-200">
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Pinga
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="https://github.com/aevrHQ/pinga-mvp"
              target="_blank"
              className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
            >
              GitHub
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium bg-black text-white px-4 py-2 rounded-full hover:bg-gray-800 transition-colors"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-32 pb-20">
        {/* Hero Section */}
        <section className="container mx-auto px-6 mb-24 md:mb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs font-medium text-gray-600 mb-8">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              v1.0 is now live
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
              Your centralized <br className="hidden md:block" /> webhook hub.
            </h1>
            <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
              Turn noisy JSON payloads into structured, actionable Telegram
              notifications. Built for developers who want clarity, not clutter.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/login"
                className="group flex items-center gap-2 bg-black text-white px-8 py-3.5 rounded-full font-medium hover:bg-gray-800 transition-all hover:pr-6"
              >
                Get Started
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="https://github.com/aevrHQ/pinga-mvp"
                target="_blank"
                className="flex items-center gap-2 px-8 py-3.5 rounded-full border border-gray-200 font-medium hover:bg-gray-50 transition-colors"
              >
                <Github className="w-4 h-4" />
                sOpens Source
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Features Grid */}
        <section className="container mx-auto px-6 mb-24">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <FeatureCard
              icon={<Github className="w-6 h-6" />}
              title="GitHub Integration"
              description="Track stars, issues, PRs, and deployments in real-time. Never miss a contribution."
            />
            <FeatureCard
              icon={<Server className="w-6 h-6" />}
              title="Render Support"
              description="Get instant alerts for your deployments. Forward emails to receive status updates."
            />
            <FeatureCard
              icon={<MessageCircle className="w-6 h-6" />}
              title="Telegram First"
              description="Notifications delivered where you actually read them. Formatted with emojis and links."
            />
          </div>
        </section>

        {/* How it works */}
        <section className="bg-gray-50 py-24 border-y border-gray-100">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-16">
                Simple by design
              </h2>
              <div className="space-y-12">
                <Step
                  number="01"
                  title="Connect"
                  description="Log in with a magic link and connect your Telegram account with one click."
                />
                <Step
                  number="02"
                  title="Configure"
                  description="Install the GitHub App or set up your unique email forwarding address."
                />
                <Step
                  number="03"
                  title="Receive"
                  description="Get beautiful, structured notifications instantly on your devices."
                />
              </div>
            </div>
          </div>
        </section>

        {/* SaaS Features */}
        <section className="container mx-auto px-6 py-24">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Built for security</h2>
              <div className="space-y-6">
                <SecurityItem text="Passwordless Authentication via Magic Link" />
                <SecurityItem text="4-Digit PIN for quick access on trusted devices" />
                <SecurityItem text="Unique webhook endpoints for every user" />
                <SecurityItem text="Open source and self-hostable" />
              </div>
            </div>
            <div className="bg-gray-100 rounded-2xl p-8 aspect-square flex items-center justify-center">
              <div className="relative w-64 h-80 bg-white rounded-xl shadow-2xl border border-gray-100 p-6 flex flex-col">
                <div className="w-8 h-8 bg-gray-100 rounded-full mb-4" />
                <div className="space-y-3 flex-1">
                  <div className="h-2 w-3/4 bg-gray-100 rounded" />
                  <div className="h-2 w-1/2 bg-gray-100 rounded" />
                  <div className="h-2 w-full bg-gray-100 rounded mt-6" />
                  <div className="h-2 w-full bg-gray-100 rounded" />
                </div>
                <div className="mt-auto pt-6 border-t border-gray-50">
                  <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                    <Lock className="w-3 h-3" />
                    <span>End-to-end encrypted</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-6 pb-20">
          <div className="bg-black text-white rounded-2xl p-12 text-center max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">
              Ready to tame your notifications?
            </h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              Join developers who are switching to a quieter, more organized way
              of tracking their projects.
            </p>
            <Link
              href="/login"
              className="inline-block bg-white text-black px-8 py-3.5 rounded-full font-medium hover:bg-gray-100 transition-colors"
            >
              Get Started for Free
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-sm text-gray-500">
            © {new Date().getFullYear()} Pinga. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <Link href="#" className="text-sm text-gray-500 hover:text-black">
              Privacy
            </Link>
            <Link href="#" className="text-sm text-gray-500 hover:text-black">
              Terms
            </Link>
            <Link href="#" className="text-sm text-gray-500 hover:text-black">
              Twitter
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-2xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
      <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-6 text-black">
        {icon}
      </div>
      <h3 className="text-lg font-bold mb-3">{title}</h3>
      <p className="text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-6 items-start group">
      <div className="text-4xl font-mono text-gray-200 font-bold group-hover:text-black transition-colors">
        {number}
      </div>
      <div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-gray-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function SecurityItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600">
        <CheckCircle2 className="w-4 h-4" />
      </div>
      <span className="text-gray-600 font-medium">{text}</span>
    </div>
  );
}
