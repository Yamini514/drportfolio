import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Hero from "./Hero";
import BookAppointment from "./ContactMe";
import Video from "./Video";
import Gallery from "./Gallery";
import Testimonials from "./Testimonials";
import Services from "./Services";
import About from "./About";
import Stats from "../components/Stats";
import ContactMe from "./ContactMe";

function Home() {
  const location = useLocation();

  useEffect(() => {
    if (location.state?.scrollTo) {
      const section = document.getElementById(location.state.scrollTo);
      if (section) {
        const sectionTop = section.getBoundingClientRect().top + window.scrollY - 75;
        window.scrollTo({ top: sectionTop, behavior: "smooth" });
      }
    }
  }, [location]);

  return (
    <>
      <div>
        <Hero id="hero" />
        <About id="about" />
        <Services id="services" />
        <Testimonials id="review" />
        <Gallery id="gallery" />
        <Video />
        <ContactMe id="contact" />
        <BookAppointment />
      </div>
    </>
  );
}

export default Home;