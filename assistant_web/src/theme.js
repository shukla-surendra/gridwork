import { extendTheme } from '@chakra-ui/react';

const space = {
  px: '1px',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  28: '7rem',
  32: '8rem',
  36: '9rem',
  40: '10rem',
  44: '11rem',
  48: '12rem',
  52: '13rem',
  56: '14rem',
  60: '15rem',
  64: '16rem',
  72: '18rem',
  80: '20rem',
  96: '24rem',
};

const theme = extendTheme({
  colors: {
    brand: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    },
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
  },
  fonts: {
    heading: 'Inter, system-ui, sans-serif',
    body: 'Inter, system-ui, sans-serif',
    mono: 'Menlo, Monaco, Consolas, "Courier New", monospace',
  },
  fontSizes: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    md: '1rem',       // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem',// 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
    '6xl': '3.75rem', // 60px
  },
  fontWeights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeights: {
    normal: 'normal',
    none: 1,
    shorter: 1.25,
    short: 1.375,
    base: 1.5,
    tall: 1.625,
    taller: 2,
  },
  letterSpacings: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
  space,
  sizes: {
    ...space,
    max: 'max-content',
    min: 'min-content',
    full: '100%',
    '3xs': '14rem',
    '2xs': '16rem',
    xs: '20rem',
    sm: '24rem',
    md: '28rem',
    lg: '32rem',
    xl: '36rem',
    '2xl': '42rem',
    '3xl': '48rem',
    '4xl': '56rem',
    '5xl': '64rem',
    '6xl': '72rem',
    '7xl': '80rem',
    '8xl': '90rem',
  },
  breakpoints: {
    sm: '30em',   // 480px
    md: '48em',   // 768px
    lg: '62em',   // 992px
    xl: '80em',   // 1280px
    '2xl': '96em',// 1536px
  },
  components: {
    // Compact-density pass: Chakra's own default size for every one of
    // these is "md". Dropping the default to "sm" app-wide is the single
    // highest-leverage way to tighten density everywhere at once -- every
    // page that never explicitly set a size (the vast majority) gets a
    // smaller, tighter control for free, with zero per-page edits.
    // Anywhere a page explicitly passed size="lg"/"md" itself is
    // unaffected (an explicit prop always wins over a theme default).
    Button: {
      baseStyle: {
        fontWeight: 'semibold',
        borderRadius: 'md',
      },
      defaultProps: { size: 'sm' },
      variants: {
        solid: {
          bg: 'brand.500',
          color: 'white',
          _hover: {
            bg: 'brand.600',
          },
        },
        outline: {
          borderColor: 'brand.500',
          color: 'brand.500',
          _hover: {
            bg: 'brand.50',
          },
        },
      },
    },
    IconButton: {
      defaultProps: { size: 'sm' },
    },
    Input: {
      baseStyle: {
        field: {
          borderRadius: 'md',
        },
      },
      defaultProps: { size: 'sm' },
    },
    Select: {
      defaultProps: { size: 'sm' },
    },
    Textarea: {
      defaultProps: { size: 'sm' },
    },
    NumberInput: {
      defaultProps: { size: 'sm' },
    },
    Switch: {
      defaultProps: { size: 'sm' },
    },
    Checkbox: {
      defaultProps: { size: 'sm' },
    },
    Radio: {
      defaultProps: { size: 'sm' },
    },
    Badge: {
      baseStyle: {
        borderRadius: 'sm',
      },
    },
    Tag: {
      defaultProps: { size: 'sm' },
    },
    Avatar: {
      defaultProps: { size: 'sm' },
    },
    Table: {
      defaultProps: { size: 'sm' },
    },
    Card: {
      baseStyle: {
        container: {
          borderRadius: 'lg',
          boxShadow: 'md',
          bg: 'white',
          _dark: {
            bg: 'gray.800',
          },
        },
        // Chakra's own Card part-padding scales off "size" (md by
        // default: 1.25rem/20px). Tightened directly rather than via
        // defaultProps size="sm", since Card doesn't expose a "sm"
        // variant with meaningfully different padding out of the box.
        header: { padding: '0.75rem 1rem' },
        body: { padding: '0.75rem 1rem' },
        footer: { padding: '0.75rem 1rem' },
      },
    },
    Modal: {
      baseStyle: {
        dialog: {
          borderRadius: 'lg',
        },
      },
    },
    Text: {
      baseStyle: {
        fontSize: 'sm',
        lineHeight: 'base',
      },
    },
    Heading: {
      baseStyle: {
        fontWeight: 'bold',
        lineHeight: 'shorter',
      },
      // The previous mapping inflated every size a full step past
      // Chakra's own scale (e.g. "sm" resolved to 18-20px, normally a
      // "md"-and-a-half) -- that fights density everywhere a page titles
      // a section with Heading size="sm"/"md"/"lg", which is most of
      // them. Tightened one step down across the board; page-level size=
      // props don't need to change, only what each token now resolves to.
      sizes: {
        '2xl': {
          fontSize: ['3xl', null, '4xl'],
        },
        xl: {
          fontSize: ['2xl', null, '3xl'],
        },
        lg: {
          fontSize: ['xl', null, '2xl'],
        },
        md: {
          fontSize: ['lg', null, 'xl'],
        },
        sm: {
          fontSize: ['md', null, 'lg'],
        },
        xs: {
          fontSize: 'sm',
        },
      },
    },
    Container: {
      baseStyle: {
        maxW: 'container.xl',
        px: { base: 3, md: 4, lg: 6 },
      },
    },
  },
  styles: {
    global: (props) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
        color: props.colorMode === 'dark' ? 'white' : 'gray.800',
        fontFamily: 'body',
        // 14px base, not 16px -- the same density lever Notion/Linear/
        // GitHub all use. Headings stay visually distinct via the
        // Heading component's own (still-larger) sizes above.
        fontSize: 'sm',
        lineHeight: 'base',
      },
      'h1, h2, h3, h4, h5, h6': {
        fontFamily: 'heading',
        fontWeight: 'bold',
        lineHeight: 'shorter',
      },
      p: {
        fontFamily: 'body',
        fontSize: 'sm',
        lineHeight: 'base',
      },
    }),
  },
  config: {
    initialColorMode: 'light',
    useSystemColorMode: true,
  },
});

export default theme; 