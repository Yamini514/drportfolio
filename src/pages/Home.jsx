import React from "react";
import Hero from "./Hero";
import Video from "./Video";
import Testimonials from "./Testimonials";
import Services from "./Services";
import About from "./About";

import Gallery from "./Gallery";
import ContactMe from "./ContactMe";

function Home() {

  
  // Scroll to section if specified in location.state
  // Remove this useEffect
  // React.useEffect(() => {
  //   if (location.state?.sectionId) {
  //     const section = document.getElementById(location.state.sectionId);
  //     if (section) {
  //       const headerHeight = document.querySelector("header")?.offsetHeight || 75;
  //       const contentTop = section.getBoundingClientRect().top + window.scrollY - headerHeight;
  //       window.scrollTo({ top: contentTop, behavior: "smooth" });
  //     }
  //   }
  // }, [location]);
  return (
    <>
      <div>
        <Hero id="hero" />
        <About id="about" />
        <Services id="services" />
        <Testimonials />
        <Gallery id="gallery" />
        <Video />
        <ContactMe id="contact" />
      </div>
    </>
  );
}

export default Home;