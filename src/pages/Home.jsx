import React from 'react'
import Hero from './Hero'
import BookAppointment from './ContactMe'
import Video from './Video'
import Gallery from './Gallery'
import Testimonials from './Testimonials'
import Services from './Services'
import About from './About'
import Stats from '../components/Stats'

function Home() {
  return (
    <>
    <div>
    <Hero/>
    <About/>
    <Services/>
    <Testimonials/>
    <Gallery/>
    <Video/>
    <BookAppointment/>
    </div>
    </>
  )
}

export default Home