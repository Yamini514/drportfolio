import React from "react";
import Hero from "./Hero";
import Video from "./Video";
import Testimonials from "./Testimonials";
import Services from "./Services";
import About from "./About";

import Gallery from "./Gallery";
import ContactMe from "./ContactMe";

function Home() {
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
      </div>
    </>
  );
}

export default Home;