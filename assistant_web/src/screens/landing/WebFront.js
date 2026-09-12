import React from "react";

import Footer from "../../components/landing/Footer";
import WebFrontNavbar from "../../components/landing/Nav/WebFrontNavbar"
import FAQ from "../../components/landing/FAQ";
import FrontPage from "./FrontPage";



function WebFront() {
  return (
<>
<WebFrontNavbar></WebFrontNavbar>
<FrontPage></FrontPage>
<FAQ></FAQ>
<Footer></Footer>
{/*
<HeroIllustration></HeroIllustration>

 */}
</>
  );
}

export default WebFront;
