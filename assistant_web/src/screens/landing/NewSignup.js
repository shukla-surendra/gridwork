import React from "react";

import Footer from "../../components/landing/Footer";
import Navbar from "../../components/landing/Nav/Navbar";
import LoginForm from "../../components/landing/LoginForm/Login"



function NewSignup() {
  return (
<>
<section className="login">
  <div className="login-rgt" />
  <div className="container-fluid">
    <div className="row">
      <div className="col-md-6 pt-5">
        <h3>
          Smart calendar to remind you of your <br /> task anywhere, everywhere!
        </h3>
        <img src="img/login-img.png" />
      </div>
      <div className="col-md-6 login-right">
        <div className="logo">
          <img src="img/logo.png" />
        </div>
        <div className="login-test">Keep you Up-to date</div>
        <div className="login-btn">
          <ul>
            <li>
              <button>
                <img src="img/google.png" />
                Continue with Google
              </button>
            </li>
          </ul>
        </div>
        <div className="text-or pt-2">Or</div>
        <div className="email-add pt-4">
          <input
            type="text"
            className="form-control"
            placeholder="Email address or user name"
            name=""
          />
        </div>
        <div className="email-add pt-3">
          <input
            type="password"
            className="form-control"
            placeholder="Enter Password"
            name=""
          />
        </div>
        <div className="email-login-btn pt-4">
          <button>Continue</button>
        </div>
        <div className="login-text pt-4">
          By creating an account, you are agreeing to our <br />
          <span>
            <a href="">Terms of Services</a>
          </span>{" "}
          and{" "}
          <span>
            <a href="">Privacy Policy</a>{" "}
          </span>
        </div>
        <div className="login-last pt-5">
          <h6>Already got an account?</h6>
          <a href="">Login Now</a>
        </div>
      </div>
    </div>
  </div>
</section>

</>
  );
}

export default NewSignup;
