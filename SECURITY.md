# Security Policy

## 🔒 Security Overview

This document outlines the security measures implemented in the CSV ML Readiness API to protect user data and system integrity.

## 🛡️ Security Measures

### File Upload Security
- **File Size Limit**: 50MB maximum to prevent resource exhaustion
- **MIME Type Validation**: Only `text/csv`, `application/csv`, and `text/plain` accepted
- **File Extension Validation**: Only `.csv` files allowed
- **Path Traversal Prevention**: Filename validation prevents `../`, `/`, and `\` characters
- **Single File Limit**: Only one file per request

### Binary Execution Security
- **PIE Binary**: Position Independent Executable for ASLR protection
- **Verified Source**: Binary from official GitHub releases with BuildID verification
- **Privilege Containment**: No privilege escalation (runs with same UID/GID)
- **Clean Environment**: Empty environment variables to prevent injection
- **Timeout Protection**: 25-second timeout prevents hanging processes
- **Isolated Execution**: Runs in `/tmp` directory with restricted stdio

### Network Security Headers
- **X-Frame-Options**: `DENY` for API endpoints, `SAMEORIGIN` for frontend
- **X-Content-Type-Options**: `nosniff` to prevent MIME type sniffing
- **Referrer-Policy**: `strict-origin-when-cross-origin` for privacy
- **X-XSS-Protection**: `1; mode=block` for legacy browser protection

### Data Protection
- **Temporary File Management**: Unique UUID-based filenames in `/tmp`
- **Automatic Cleanup**: Files deleted after processing or on error
- **No Data Persistence**: No user data stored permanently
- **Memory-Safe Processing**: Stream-based CSV parsing with limits

### Infrastructure Security
- **Serverless Architecture**: No persistent server state to compromise
- **Vercel Security**: Automatic HTTPS, DDoS protection, edge caching
- **Function Isolation**: Each request runs in isolated environment
- **Limited Runtime**: 30-second max duration prevents resource abuse

## 🚨 Known Limitations

### Dependency Vulnerabilities
Current npm audit shows 13 vulnerabilities in development dependencies:
- **Impact**: Development/build time only, not runtime
- **Affected**: Vercel CLI tools (esbuild, path-to-regexp, undici, etc.)
- **Mitigation**: These are not exposed in production runtime

### Binary Trust
- **Source**: Official dataprof v0.4.61 from GitHub releases
- **Verification**: BuildID `b1d40214b0d3ae846ea615545279cbcbd8df26be`
- **Risk**: Binary execution requires trust in upstream project
- **Fallback**: JavaScript implementation available if binary fails

## 📋 Security Checklist

### Implemented ✅
- [x] Input validation and sanitization
- [x] File upload restrictions and validation
- [x] Resource limits (size, timeout, memory)
- [x] Security headers implementation
- [x] Binary execution hardening
- [x] Temporary file management
- [x] Error handling without information disclosure
- [x] HTTPS enforcement (Vercel automatic)
- [x] No sensitive data logging

### Not Applicable ❌
- [ ] Authentication (public API by design)
- [ ] Rate limiting (handled by Vercel)
- [ ] Data encryption at rest (no persistent storage)
- [ ] User access controls (public service)

## 🔍 Security Testing

### Performed Tests
1. **File Upload Attack Vectors**
   - Path traversal attempts
   - Malicious MIME types
   - Oversized files
   - Multiple file uploads

2. **Binary Execution Tests**
   - Timeout handling
   - Clean environment verification
   - Privilege containment
   - Error path cleanup

3. **Input Validation**
   - Malformed CSV files
   - Binary file uploads
   - Empty/null inputs
   - Special characters in filenames

## 🚨 Reporting Security Issues

If you discover a security vulnerability, please:

1. **DO NOT** open a public GitHub issue
2. **Email**: [Security contact from dataprof project]
3. **Include**:
   - Detailed description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fix (if known)

## 📝 Security Updates

This security policy is reviewed and updated with each release. Last updated: September 2025.

## ⚖️ Compliance

This implementation follows:
- **OWASP Top 10** security guidelines
- **CWE/SANS Top 25** vulnerability prevention
- **Vercel Security Best Practices**
- **Node.js Security Guidelines**

## 🔄 Security Maintenance

### Regular Tasks
- Monthly dependency vulnerability scans
- Quarterly security header verification
- Binary source verification on updates
- Security policy review with major releases

### Automated Monitoring
- Vercel automatic security scanning
- GitHub Dependabot alerts
- Runtime error monitoring
- Resource usage monitoring