import React from 'react';
import Hero from './Hero';
import BookAppointment from './ContactMe';
import Video from './Video';
import Gallery from './Gallery';
import Testimonials from './Testimonials';
import Services from './Services';
import About from './About';
import Stats from '../components/Stats';

function Home() {
  return (
    <>
      <div>
        <Hero id="hero"/>
        <About id="about"/>
        <Services id="services"/>
        <Testimonials id="review"/> {/* Ensure id matches sectionId in navLinks */}
        <Gallery id="gallery"/>
        <Video id="video"/>
        <BookAppointment/>
      </div>
    </>
  );
}

export default Home;