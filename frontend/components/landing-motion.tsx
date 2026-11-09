"use client";
import { useEffect, useState } from "react";

/** Add viewport motion without hiding any prerendered content. */
export function LandingMotion() {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const root = document.querySelector(".sc-marketing");
    if (!root || !("IntersectionObserver" in window)) return;
    root.setAttribute("data-motion-ready", "");
    root.toggleAttribute("data-motion-paused", paused);
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    let observer: IntersectionObserver | undefined;
    function play(
      element: Element,
      frames: Keyframe[],
      delay = 0,
      duration = 1000,
    ) {
      const animation = element.animate(frames, {
        duration,
        delay,
        easing: "cubic-bezier(.16,1,.3,1)",
      });
      animations.add(animation);
      animation.onfinish = () => animations.delete(animation);
    }
    function stop() {
      observer?.disconnect();
      animations.forEach((animation) => animation.cancel());
      animations.clear();
    }
    function start() {
      stop();
      if (preference.matches || paused) return;
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const element = entry.target;
            const index = Array.from(
              element.parentElement?.children || [],
            ).indexOf(element);
            play(
              element,
              [
                { transform: "translate3d(0, 40px, 0)" },
                { transform: "translate3d(0, 0, 0)" },
              ],
              Math.min(index, 4) * 100,
            );
            if (element.matches(".sc-project-preview")) {
              element
                .querySelectorAll(".sc-chart-bars i")
                .forEach((bar, i) =>
                  play(
                    bar,
                    [{ transform: "scaleY(.04)" }, { transform: "scaleY(1)" }],
                    i * 90,
                    1500,
                  ),
                );
              element
                .querySelectorAll(".sc-preview-progress i")
                .forEach((bar, i) =>
                  play(
                    bar,
                    [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
                    i * 160,
                    1500,
                  ),
                );
            }
            observer?.unobserve(element);
          });
        },
        { threshold: 0.12 },
      );
      root
        ?.querySelectorAll(
          ".sc-section-heading, .sc-feature-grid article, .sc-project-preview, .sc-steps li, .sc-personas article, .sc-faq details, .sc-final",
        )
        .forEach((element) => observer?.observe(element));
    }
    start();
    preference.addEventListener("change", start);
    return () => {
      stop();
      preference.removeEventListener("change", start);
    };
  }, [paused]);
  return (
    <button
      type="button"
      className="sc-motion-control"
      aria-pressed={paused}
      onClick={() => setPaused((value) => !value)}
    >
      {paused ? "Resume motion" : "Pause motion"}
    </button>
  );
}
