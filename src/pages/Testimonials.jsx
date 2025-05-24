// Testimonials.jsx - Front-end display component
import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

// Import default images correctly
import patient1 from '../assets/patient1.jpg';
import patient2 from '../assets/patient2.jpg';
import patient3 from '../assets/patient3.jpg';

function Testimonials() {
  const { currentTheme } = useTheme();

  // Move defaultTestimonials declaration before useState
  const defaultTestimonials = [
    {
      id: 1,
      name: "Shri. Sanjay Choudhari",
      content: "Thank you doctor for your confidence in treating my father. I really appreciate the way you handled his case. Your confidence made me take a decision of bringing my father from Mumbai to Hyderabad. You have a unique ability to make patient's attendant understand patient's situation. Offcourse you are highly skilled and i might not be the right person to judge it, but i feel you are one of those best doctors i have ever met. May god bless you and give you the courage to keep up your good work. Thank you doctor thank you for all your support."
    },
    {
      id: 2,
      name: "Shri. Ramesh Mahindra",
      content: "My younger brother kiran kumar had Severe spinal canal stenosis at L4-L5. We approached Dr.Laxminadh , He did detailed analysis. And explained to us in detail what is happening in back calmly. Also explained what kind of surgery procedure going to perform to correct it. Also discussed other risk factor associated with it. It gave very much confidence to go with this Dr. for this surgery. Finally he undergone surgery by Dr. Laxminadh. It went smooth. His back pain is gone and he is in recovery path. Dr. Is easily reachable, experienced, competent with latest surgery equipments . My brother and our full family strongly recommend this Doctor."
    },
    {
      id: 3,
      name: "Shri. Ravi Kishore",
      content: "Dr Laxminadh Sivaraju is a very professional and experienced neuro surgeon in Continental hospitals Hyderabad. We have consulted him for a L5 disc prolapse problem for my wife during May 2020 for the treatment . Dr Laxminadh was very professional in explaining the detail of the problem and the surgery implications coz we were little skeptical about opting for a surgery initially.With his expert guidance and confidence we went ahead and got the surgery done and now my wife has recovered well post the treatment. Dr keeps in touch with us regularly and tracks the recovery and progress even after 3 months of the surgery and we are thankful to him for his gesture and would definitely recommend him. Wish you all the best Dr Laxminadh Sivaraju for your future endeavors."
    }
  ];

  // Now we can use defaultTestimonials in useState
  const [testimonials, setTestimonials] = useState(defaultTestimonials);

  // Update the useEffect to not include role
  useEffect(() => {
    const storedTestimonials = localStorage.getItem('testimonials');
    
    if (storedTestimonials) {
      const transformedTestimonials = JSON.parse(storedTestimonials).map(item => ({
        id: item.id,
        name: item.name,
        content: item.content
      }));
      
      setTestimonials(transformedTestimonials);
    } else {
      setTestimonials(defaultTestimonials);
    }
  }, []);

  // Update the testimonial display in the Swiper
  return (
    <div className="pb-5 px-5 md:px-15 md:pb-5 lg:px-20" style={{ backgroundColor: currentTheme.background }}>
      {/* <div className="container mx-auto max-w-4xl"> */}
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Patient Stories</h1>
          <p className="text-lg" style={{ color: currentTheme.text.secondary }}>
            Hear from our patients about their experiences and outcomes following treatment with Dr. Laxminadh Sivaraju.
          </p>
        </div>

        {/* Testimonials Slider */}
        <Swiper
          modules={[Pagination, Autoplay]}
          spaceBetween={30}
          slidesPerView={1}
          pagination={{ clickable: true }}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true
          }}
          loop={true}
          className="testimonials-swiper hover:cursor-pointer"
        >
          {testimonials.map((testimonial) => (
            <SwiperSlide key={testimonial.id}>
              <div
                style={{
                  backgroundColor: currentTheme.surface,
                  borderColor: currentTheme.border
                }}
                className="rounded-lg border p-8 flex flex-col items-center text-center mb-12"
              >
                <svg
                  className="w-10 h-10 mb-6"
                  style={{ color: currentTheme.primary }}
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="text-xl mb-8" style={{ color: currentTheme.text.secondary }}>
                  {testimonial.content}
                </p>
                <div>
                  <h3 className="font-semibold text-lg">{testimonial.name}</h3>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    // </div>
  );
}

export default Testimonials;