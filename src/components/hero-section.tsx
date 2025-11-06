"use client";

import Link from "next/link";
import { ArrowRight, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function HeroSection() {

  return (
    <main className="overflow-hidden">
      <section>
        <div className="relative pt-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-3xl text-center sm:mx-auto lg:mr-auto lg:mt-0 lg:w-4/5">
              <Link
                href="/"
                className="rounded-(--radius) mx-auto flex w-fit items-center gap-2 border p-1 pr-3"
              >
                <span className="bg-muted rounded-[calc(var(--radius)-0.25rem)] px-2 py-1 text-xs">
                  Miri
                </span>
                <span className="text-sm">Write, reflect, and plan smarter — all in one place.</span>
                <span className="bg-(--color-border) block h-4 w-px"></span>

                <ArrowRight className="size-4" />
              </Link>

              <h1 className="mt-8 text-balance text-4xl font-semibold md:text-5xl xl:text-6xl xl:leading-[1.125]">
                Capture, organize, and grow your ideas
              </h1>
              <p className="mx-auto mt-8 hidden max-w-2xl text-wrap text-lg sm:block">
                A lightweight Notion-like workspace for note-taking, journaling, and task flow — designed to keep your thoughts structured and your creativity flowing.
              </p>

              <div className="mt-8">
                <Button size="lg" asChild>
                  <Link href="sign-up">
                    <Rocket className="relative size-4" />
                    <span className="text-nowrap">Start Building</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="mask-b-from-55% relative mx-auto mt-16 max-w-6xl overflow-hidden px-4">
            <Image
              className="z-2 border-border/25 relative hidden rounded-2xl border dark:block"
              src="/music.png"
              alt="app screen"
              width={2796}
              height={2008}
            />
            <Image
              className="z-2 border-border/25 relative rounded-2xl border dark:hidden"
              src="/music-light.png"
              alt="app screen"
              width={2796}
              height={2008}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
