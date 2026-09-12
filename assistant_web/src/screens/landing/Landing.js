import React from "react";

import Footer from "../../components/landing/Footer";
import Navbar from "../../components/landing/Nav/Navbar"
import FAQ from "../../components/landing/FAQ";
import FrontPage from "./FrontPage";



function Landing() {
  return (
<>
<Navbar></Navbar>
<FrontPage></FrontPage>
<FAQ></FAQ>
<Footer></Footer>
{/*
<HeroIllustration></HeroIllustration>

 */}
</>
  );
}

export default Landing;
