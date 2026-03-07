import LandingLayout from "@/components/layouts/LandingLayout";
import HeroSection from "@/components/landing/HeroSection";
import PromiseSection from "@/components/landing/PromiseSection";
import ModalitiesSection from "@/components/landing/ModalitiesSection";
import CoursesSection from "@/components/landing/CoursesSection";

export default function Home() {
  return (
    <LandingLayout>
      <HeroSection />
      <PromiseSection />
      <ModalitiesSection />
      <CoursesSection />
    </LandingLayout>
  );
}
