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
        Student Accommodation Preston | En-Suite Rooms - Urban Hub
      </h1>
      <p className="sr-only">
        Urban Hub Preston offers modern en-suite rooms minutes from University of Lancashire, with bills included and no guarantor needed upfront. Book your viewing today.
      </p>
      <div className="animate-pulse" aria-hidden>
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    </div>
  );
};

export default Index;
