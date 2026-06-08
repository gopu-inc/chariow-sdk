# Contributing to Chariow SDK

We love your input! We want to make contributing to Chariow SDK as easy and transparent as possible.

## Development Process

1. Fork the repo and create your branch from `main`
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Make your changes
5. Test your changes: `npm test`
6. Run linting: `npm run lint`
7. Format code: `npm run format`
8. Push to your fork and submit a pull request

## How to Contribute

### Report Bugs

- Use the issue tracker
- Describe the bug in detail
- Include steps to reproduce
- Include expected and actual behavior
- Add screenshots if applicable

### Suggest Enhancements

- Use the issue tracker
- Describe the enhancement in detail
- Explain why it would be valuable

### Pull Requests

- Update the README.md if needed
- Update the documentation
- Add tests for new features
- Follow the existing code style

## Development Setup

```bash
# Clone the repository
git clone https://github.com/chariow/chariow-sdk.git

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run linting
npm run lint

## 13. `SECURITY.md`

```bash
cat > SECURITY.md << 'EOF'
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | ✅                 |
| 1.x.x   | ❌                 |

## Reporting a Vulnerability

Please report security vulnerabilities to **security@chariow.com**

Do NOT report security vulnerabilities through public GitHub issues.

## What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any possible fixes (optional)

## Response Process

1. We will acknowledge receipt within 48 hours
2. We will investigate and validate the issue
3. We will develop and test a fix
4. We will release a patch
5. We will publicly disclose the issue after fix is released

## Security Best Practices

- Keep your API keys secure
- Use environment variables for sensitive data
- Regularly update to the latest version
- Review API access logs periodically
- Rotate API keys periodically
