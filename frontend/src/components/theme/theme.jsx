import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    // Typography configuration with Poppins
    typography: {
        fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',

        // Headers
        h1: {
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 500,
            fontSize: '2.67rem',
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
        },
        h2: {
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 500,
            fontSize: '2.23rem',
            lineHeight: 1.3,
            letterSpacing: '-0.01em',
        },
        h3: {
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 500,
            fontSize: '2rem',
            lineHeight: 1.3,
            letterSpacing: '-0.01em',
        },
        h4: {
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 500,
            fontSize: '1.9rem',
            lineHeight: 1.4,
        },
        h5: {
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 500,
            fontSize: '1.85rem',
            lineHeight: 1.4,
        },
        h6: {
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 500,
            fontSize: '1.2rem',
            lineHeight: 1.4,
        },

        // Body text
        body1: {
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 300,
            fontSize: '.85rem',
            lineHeight: 1.6,
        },
        body2: {
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 300,
            fontSize: '0.95rem',
            lineHeight: 1.6,
        },

        // Buttons
        button: {
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 500,
            fontSize: '0.875rem',
            lineHeight: 1.5,
            textTransform: 'none', 
            letterSpacing: '0.02em',
        },

        // Captions and overlines
        caption: {
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 400,
            fontSize: '0.75rem',
            lineHeight: 1.5,
        },
        overline: {
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 500,
            fontSize: '0.75rem',
            lineHeight: 1.5,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
        },

        // Subtitle variants
        subtitle1: {
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 500,
            fontSize: '0.75rem',
            lineHeight: 1.5,
        },
        subtitle2: {
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 500,
            fontSize: '0.75rem',
            lineHeight: 1.5,
        }
    },
    // Custom shadow definitions
    shadows: [
        'none',
        '0px 2px 4px rgba(0, 0, 0, 0.02), 0px 1px 2px rgba(0, 0, 0, 0.04)', // elevation 1
        '0px 4px 8px rgba(0, 0, 0, 0.04), 0px 2px 4px rgba(0, 0, 0, 0.06)', // elevation 2
        '0px 8px 16px rgba(0, 0, 0, 0.06), 0px 4px 8px rgba(0, 0, 0, 0.08)', // elevation 3
        '0px 12px 24px rgba(0, 0, 0, 0.08), 0px 6px 12px rgba(0, 0, 0, 0.10)', // elevation 4
        '0px 16px 32px rgba(0, 0, 0, 0.10), 0px 8px 16px rgba(0, 0, 0, 0.12)', // elevation 5
        '0px 20px 40px rgba(0, 0, 0, 0.12), 0px 10px 20px rgba(0, 0, 0, 0.14)', // elevation 6
        '0px 24px 48px rgba(0, 0, 0, 0.14), 0px 12px 24px rgba(0, 0, 0, 0.16)', // elevation 7
        '0px 28px 56px rgba(0, 0, 0, 0.16), 0px 14px 28px rgba(0, 0, 0, 0.18)', // elevation 8
        // ... continue for all 25 elevation levels if needed
        ...Array(16).fill('0px 32px 64px rgba(0, 0, 0, 0.18), 0px 16px 32px rgba(0, 0, 0, 0.20)')
    ],


    components: {

        MuiTextField: {
            defaultProps: {
                variant: 'outlined',
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    backgroundColor: '#fff',
                    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
                    '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#e0e0e0',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#bdbdbd',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#3f51b5',
                        boxShadow: '0 0 0 2px rgba(63, 81, 181, 0.1)',
                    }
                },
                input: {
                    padding: '12px 14px',
                }
            }
        },
        MuiInputLabel: {
            styleOverrides: {
                root: {
                    fontWeight: 500,
                    color: '#666',
                    '&.Mui-focused': {
                        color: '#3f51b5',
                    }
                }
            }
        },
        MuiFormHelperText: {
            styleOverrides: {
                root: {
                    fontSize: '0.75rem',
                    marginLeft: 0,
                }
            }
        },



        MuiAutocomplete: {
            styleOverrides: {
                paper: {
                    borderRadius: 12,
                },
                option: {
                    fontSize: '0.9rem',
                },
            }
        },
        MuiSelect: {
            styleOverrides: {
                outlined: {
                    borderRadius: 12,
                },
            },
        },

        MuiFormControl: {
            styleOverrides: {
                root: {
                    '& .Mui-focused': {
                        boxShadow: '0 0 0 2px rgba(63, 81, 181, 0.1)',
                    },
                }
            }
        },

        MuiCheckbox: {
            styleOverrides: {
                root: {
                    borderRadius: 6,
                }
            }
        },
        MuiSwitch: {
            styleOverrides: {
                root: {
                    width: 42,
                    height: 26,
                    padding: 0,
                    '& .MuiSwitch-switchBase': {
                        padding: 2,
                        '&.Mui-checked': {
                            transform: 'translateX(16px)',
                            color: '#fff',
                            '& + .MuiSwitch-track': {
                                backgroundColor: '#3f51b5',
                                opacity: 1,
                            }
                        }
                    },
                    '& .MuiSwitch-thumb': {
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                    },
                    '& .MuiSwitch-track': {
                        borderRadius: 13,
                        backgroundColor: '#e0e0e0',
                        opacity: 1,
                        transition: 'background-color 0.3s',
                    }
                }
            }
        },

        MuiButton: {
            styleOverrides: {
                root: {
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 400,
                    textTransform: 'none',
                    borderRadius: 8,
                    padding: '7px 10px',
                    boxShadow: 'none',
                    transition: 'all 0.25s ease-in-out',
                    border: '1px solid transparent',

                    '&:hover': {
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                        transform: 'translateY(-1px)',
                        outline: 'none',

                    },
                    '&:focus-visible': {
                        outline: 'none',
                        boxShadow: '0 0 0 4pc rgba(63, 81, 181, 0.2)',
                    },

                    '&:disabled': {
                        color: '#aaa',
                        backgroundColor: '#f5f5f5',
                        border: '1px solid #e0e0e0',
                    }
                },

                containedPrimary: {
                    border: '0px',
                    backgroundColor: '#1976d2',
                    color: '#fff',
                    outline: 'none',
                    '&:hover': {
                        backgroundColor: '#1976d2',
                        outline: 'none',

                    }
                },
                contained: {
                    border: '0px',
                    backgroundColor: '#1976d2',
                    color: '#fff',
                    outline: 'none',

                    '&:hover': {
                        backgroundColor: '#1976d2',
                        outline: 'none',

                    }
                },
                outlinedPrimary: {
                    borderColor: '#1976d2',
                    color: '#1976d2',
                    backgroundColor: 'transparent',
                    '&:hover': {
                        backgroundColor: 'rgba(23, 51, 208, 0.04)',
                        borderColor: '#3f51b5',
                    }
                },
                outlined: {
                    borderColor: '#1976d2',
                    color: '#1976d2',
                    backgroundColor: 'transparent',
                    '&:hover': {
                        backgroundColor: 'rgba(23, 51, 208, 0.04)',
                        borderColor: '#3f51b5',
                    }
                },
                textPrimary: {
                    color: '#3f51b5',
                    '&:hover': {
                        backgroundColor: 'rgba(63, 81, 181, 0.04)',
                    }
                }
            }
        },

        MuiButtonBase: {
            styleOverrides: {
                root: {
                    '&:focus-visible': {
                        outline: 'none',
                    }
                }
            }
        },
        // Global Card styling
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16, // Rounded corners like your reference
                    border: '1px solid rgba(0, 0, 0, 0.06)', // Subtle border
                    backgroundColor: '#ffffff',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', // Smooth transitions

                    // Default shadow (elevation 1)
                    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04), 0px 1px 4px rgba(0, 0, 0, 0.06)',

                    // Hover effect
                    '&:hover': {
                        boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.08), 0px 4px 12px rgba(0, 0, 0, 0.10)',
                        transform: 'translateY(-2px)',
                        borderColor: 'rgba(0, 0, 0, 0.10)',
                    },

                    // Focus effect (for clickable cards)
                    '&:focus-within': {
                        boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.08), 0px 4px 12px rgba(0, 0, 0, 0.10)',
                        borderColor: 'primary.main',
                    }
                }
            }
        },

        // Paper component (if you use it)
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    backgroundColor: '#ffffff',

                    // Override default Paper shadows
                    '&.MuiPaper-elevation0': {
                        boxShadow: 'none',
                        border: '1px solid rgba(0, 0, 0, 0.12)',
                    },
                    '&.MuiPaper-elevation1': {
                        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04), 0px 1px 4px rgba(0, 0, 0, 0.06)',
                    },
                    '&.MuiPaper-elevation2': {
                        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.06), 0px 2px 8px rgba(0, 0, 0, 0.08)',
                    },
                    '&.MuiPaper-elevation3': {
                        boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.08), 0px 4px 12px rgba(0, 0, 0, 0.10)',
                    }
                }
            }
        },

        // CardContent styling for better spacing
        MuiCardContent: {
            styleOverrides: {
                root: {
                    padding: '24px',
                    '&:last-child': {
                        paddingBottom: '24px', // Consistent bottom padding
                    }
                }
            }
        },

        // CardActions styling
        MuiCardActions: {
            styleOverrides: {
                root: {
                    padding: '16px 24px',
                    borderTop: '1px solid rgba(0, 0, 0, 0.06)',
                }
            }
        }
    },

    // Optional: Custom color palette to match modern design
    palette: {
        background: {
            default: '#fafafa', // Light gray background
            paper: '#ffffff',
        },
        grey: {
            50: '#fafafa',
            100: '#f5f5f5',
            200: '#eeeeee',
            300: '#e0e0e0',
            400: '#bdbdbd',
            500: '#9e9e9e',
        }
    }
});

export default theme;