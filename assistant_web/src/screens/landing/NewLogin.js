import React from "react";




function NewLogin() {
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
            <li>
              <button>
                <img src="img/apple.png" />
                Continue with Apple
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
        <div className="email-login-btn pt-4">
          <button>Continue</button>
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="check1"
              name="option1"
              defaultValue="something"
            />
            <label className="form-check-label" htmlFor="check1">
              Remember me
            </label>
          </div>
        </div>
        <div className="login-last pt-5">
          <h6>Don't have an account yet?</h6>
          <a href="">Create Account</a>
        </div>
      </div>
    </div>
  </div>
</section>

</>
  );
}

export default NewLogin;
