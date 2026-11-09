"use client";
import { useEffect } from "react";

/** Enhance native details while preserving its keyboard and no-JavaScript behavior. */
export function LandingInteractions() {
  useEffect(() => {
    const root = document.querySelector(".sc-marketing");
    if (!root) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const active = new Map<
      HTMLDetailsElement,
      { animation: Animation; expanding: boolean }
    >();
    function settle(details: HTMLDetailsElement, expanding: boolean) {
      details.open = expanding;
      details.style.removeProperty("height");
      details.style.removeProperty("overflow");
      details.removeAttribute("data-closing");
      active.delete(details);
      root?.dispatchEvent(new Event("landing-layout-change"));
    }
    function finishAll() {
      active.forEach(({ animation, expanding }, details) => {
        animation.cancel();
        settle(details, expanding);
      });
    }
    function onPreferenceChange() {
      if (preference.matches) finishAll();
    }
    function onClick(event: Event) {
      if (!(event.target instanceof Element) || event.defaultPrevented) return;
      const summary = event.target.closest("summary");
      const details = summary?.parentElement;
      if (
        !(details instanceof HTMLDetailsElement) ||
        !details.closest(".sc-faq")
      )
        return;
      if (preference.matches || root?.hasAttribute("data-motion-paused"))
        return;
      event.preventDefault();
      const current = active.get(details);
      const expanding = current ? !current.expanding : !details.open;
      const startHeight = details.getBoundingClientRect().height;
      details.style.height = `${startHeight}px`;
      current?.animation.cancel();
      details.open = true;
      details.style.overflow = "hidden";
      details.toggleAttribute("data-closing", !expanding);
      const borders =
        parseFloat(getComputedStyle(details).borderTopWidth) +
        parseFloat(getComputedStyle(details).borderBottomWidth);
      const content = details.querySelector("p");
      const endHeight =
        summary!.getBoundingClientRect().height +
        borders +
        (expanding ? content?.getBoundingClientRect().height || 0 : 0);
      const animation = details.animate(
        [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
        { duration: 360, easing: "cubic-bezier(.22,1,.36,1)", fill: "both" },
      );
      active.set(details, { animation, expanding });
      animation.onfinish = () => {
        if (active.get(details)?.animation !== animation) return;
        settle(details, expanding);
        animation.cancel();
      };
    }
    root.addEventListener("click", onClick);
    preference.addEventListener("change", onPreferenceChange);
    return () => {
      root.removeEventListener("click", onClick);
      preference.removeEventListener("change", onPreferenceChange);
      finishAll();
    };
  }, []);
  return null;
}
