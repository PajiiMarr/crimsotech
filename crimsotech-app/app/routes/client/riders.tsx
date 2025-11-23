import { div } from 'motion/react-client';
import { Header } from '~/components/client/header';
import type { Route } from './+types/riders';
import { Button } from '~/components/ui/button'; 
import { Link } from 'react-router';



export default function Rider() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      <Header />

      <section className="flex-grow flex items-center">
        <div className="grid max-w-screen-xl px-4 py-8 mx-auto lg:gap-8 xl:gap-0 lg:py-16 lg:grid-cols-12">

          <div className="mr-auto place-self-center lg:col-span-7">
            <h1 className="max-w-2xl mb-4 text-4xl font-extrabold tracking-tight leading-none md:text-5xl xl:text-6xl dark:text-white">
              Become a Courier Partner Today
            </h1>
            <p className="max-w-2xl mb-6 font-light text-gray-500 lg:mb-8 md:text-lg lg:text-xl dark:text-gray-400">
              Join our growing delivery network and start earning on your own schedule. Whether you drive a car, motorcycle, or bicycle, 
              you can be part of our fast and reliable rider community.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/apply" className="w-full sm:w-auto">
                 <Button>Apply Now
                  <svg
                    className="w-5 h-5 ml-2 -mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                </Button>
              </Link>

              <Link to="/learn" className="w-full sm:w-auto">
                <Button variant="secondary" className="px-5 py-3">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>

    
          <div className="hidden lg:mt-0 lg:col-span-5 lg:flex">
            <img
              src="public/orange_rider.png"
              alt="mockup"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
