"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Supabase reports some auth outcomes in the URL *hash*, which never reaches
 * the server: provider errors ("#error=access_denied&error_description=…")
 * and implicit-flow tokens ("#access_token=…"). Mounted once in the root
 * layout so a user who lands anywhere with such a hash is routed properly
 * instead of sitting on a page that looks signed-out.
 */
export default function AuthHashRedirect() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    if (!hash) return;
    const params = new URLSearchParams(hash);

    if (params.has("error")) {
      const code = params.get("error") === "access_denied" ? "oauth_denied" : "oauth_failed";
      window.history.replaceState(null, "", window.location.pathname);
      router.replace(`/login?error=${code}`);
      return;
    }

    if (params.has("access_token")) {
      // Let the browser client absorb the session from the hash, then move on.
      const supabase = createClient();
      supabase.auth.getSession().then(({ data }) => {
        window.history.replaceState(null, "", window.location.pathname);
        router.replace(data.session ? "/dashboard" : "/login?error=auth_callback_failed");
        router.refresh();
      });
    }
  }, [router]);

  return null;
}
