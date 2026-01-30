import { useState, useEffect } from "react";
import { Link } from "react-router";

export function Header() {
  const [show, setShow] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const controlHeader = () => {
    if (typeof window !== "undefined") {
      if (window.scrollY > lastScrollY) {
        // Scrolling down
        setShow(false);
      } else {
        // Scrolling up
        setShow(true);
      }
      setLastScrollY(window.scrollY);
    }
  };

  useEffect(() => {
    window.addEventListener("scroll", controlHeader);
    return () => {
      window.removeEventListener("scroll", controlHeader);
    };
  }, [lastScrollY]);

  return (
    <header
      className={`fixed top-0 w-full flex items-center justify-between p-3 text-lg 
                  bg-white/20 backdrop-blur-xl shadow-md
                  transition-transform duration-300 z-50
                  ${show ? "translate-y-0" : "-translate-y-full"}`}
    >
      <div className="flex items-center gap-2 p-3">
        <Link to="/" className="w-25 h-25 p-3 font-bold">
          <img
            src="logo.jpg"
            alt="crimsotech"
            className="w-full h-full object-contain"
          />
        </Link>
        <Link to="/" className="hover:text-orange-500 p-3">CrimsoTech</Link>
        <Link to="/about" className="hover:text-orange-500 p-3">About us</Link>
        <Link to="/" className="hover:text-orange-500 p-3">Services</Link>
        <Link to="/" className="hover:text-orange-500 p-3">Volunteer</Link>
        <Link to="/riders" className="hover:text-orange-500 p-3">Be a Rider</Link>
      </div>
      <div className="p-3">
        <Link to="/login">
          <p className="hover:text-orange-100">Shop Now</p>
        </Link>
      </div>
    </header>
  );
}
