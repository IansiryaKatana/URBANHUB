import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to most recent future academic year
    const redirectToDefaultYear = async () => {
      const { data } = await supabase
        .from("academic_years")
        .select("name")
        .eq("is_active", true)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const urlYear = data.name.replace(/\//g, "-");
        navigate(`/studios/${urlYear}`, { replace: true });
      } else {
        // Fallback to /studios if no academic years
        navigate("/studios", { replace: true });
      }
    };

    redirectToDefaultYear();
  }, [navigate]);

  // Minimal loading state with H1 and keywords for SEO (crawlers may hit / before redirect)
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-4">
      <h1 className="sr-only focus:not-sr-only">
        Urban Hub Student Accommodation Preston – Studios &amp; Room Types
      </h1>
      <p className="sr-only">
        Student accommodation in Preston. Book your studio apartment for the academic year. Gold, Silver, Platinum and Rhodium studios.
      </p>
      <div className="animate-pulse" aria-hidden>
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    </div>
  );
};

export default Index;
