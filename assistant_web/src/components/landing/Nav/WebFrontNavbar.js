import {
  Text,
  MenuItem,
  useDisclosure,
  useColorModeValue
} from '@chakra-ui/react';

//   import { RiFlashlightFill } from 'react-icons/ri';
import Auth from '../../../utils/auth'
import Link from 'next/link';

const navLinks = [
  { name: 'Pomodoro', path: '/pomodoro' },
  { name: 'About', path: '/about' },
  // { name: 'Features', path: '/feature' },
  // { name: 'Pricing', path: '/pricing' }
];

const dropdownLinks = [
  {
    name: 'Blog',
    path: '/blogs'
  }
];

export default function Navbar() {
  const logout = (event) => {
    event.preventDefault();
    Auth.logout()
  }
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <>

      <section className="fokii-header" id="header">
        <div className="container">
          <div className="row">
            <div className="col">
              {/* ============= COMPONENT ============== */}
              <nav className="navbar navbar-expand-lg navbar-dark">
                <div className="container-fluid">
                  <Link className="navbar-brand" href="/">
                    <img height="80" width="80"  src={process.env.PUBLIC_URL + '/img/logo.png'} />
                  </Link>
                  <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#main_nav"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                  >
                    <span className="navbar-toggler-icon" />
                  </button>
                  <div className="navbar-collapse" id="main_nav">
                    <ul className="navbar-nav">
                      <li className="nav-item active">
                  
                        <Link className="nav-link" href="/about">
                          About
                        </Link>
                      </li>
                      {/* <li className="nav-item">
                        <Link className="nav-link" href="/pomodoro">
                    
                          Pomodoro
                        </Link>
                      </li> */}
                      {/* <li className="nav-item dropdown">
                        <a
                          className="nav-link  dropdown-toggle"
                          href="#"
                          data-bs-toggle="dropdown"
                        >
                          {" "}
                          Solutions
                        </a>
                        <ul class="dropdown-menu">
                                                    <li><a class="dropdown-item" href="#"> Submenu item 1</a></li>
                                                    <li><a class="dropdown-item" href="#"> Submenu item 2 </a></li>
                                                    <li><a class="dropdown-item" href="#"> Submenu item 3 </a></li>
                                                </ul>
                      </li> */}
                    </ul>
                    <div className="navbar-nav ms-auto head-right">
                      <ul>
                      {Auth.loggedIn() ? (<>
                       
                        <li><Link href={'#'} onClick={logout}>Logout</Link></li>
                       
                      </>) :(<>
                        {/* <li><Link href={'/login'}>Login</Link></li> */}
                        {/* <li><Link href={'/signup'}>Sign Up</Link></li> */}
                      </>)}

                      </ul>
                    </div>
                  </div>{" "}
                  {/* navbar-collapse.// */}
                </div>{" "}
                {/* container-fluid.// */}
              </nav>
            </div>
          </div>
        </div>
      </section>

    </>);
}



const NavLink = ({ name, path, onClose }) => {
  return (
    <Link href={path}
      lineHeight="inherit"
      _hover={{
        textDecoration: 'none',
        color: useColorModeValue('blue.500', 'blue.200')
      }}
      onClick={() => onClose()}
    >
      {name}
    </Link>
  );
};

const MenuLink = ({ name, path, onClose }) => {
  return (
    <Link href={path} onClick={() => onClose()}>
      <MenuItem _hover={{ color: 'blue.400', bg: useColorModeValue('gray.200', 'gray.700') }}>
        <Text>{name}</Text>
      </MenuItem>
    </Link>
  );
};