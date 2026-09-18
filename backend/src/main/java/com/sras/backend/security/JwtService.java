package com.sras.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

/**
 * Creates and validates stateless JSON Web Tokens.
 *
 * <p>Tokens carry the username as the subject and the granted roles as a {@code roles} claim,
 * so authentication can be reconstructed without a database lookup.
 */
@Service
public class JwtService {

    private final SecretKey signingKey;
    private final long expirationMs;
    private final long refreshExpirationMs;
    private final long registrationTicketMs;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMs,
            @Value("${app.jwt.refresh-expiration-ms}") long refreshExpirationMs,
            @Value("${app.jwt.registration-ticket-ms}") long registrationTicketMs) {
        this.signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
        this.expirationMs = expirationMs;
        this.refreshExpirationMs = refreshExpirationMs;
        this.registrationTicketMs = registrationTicketMs;
    }

    public String generateToken(String username, Collection<String> roles) {
        return buildToken(username, roles, expirationMs);
    }

    public String generateRefreshToken(String username) {
        return buildToken(username, List.of(), refreshExpirationMs);
    }

    /**
     * Short-lived, signed "vé đăng ký" issued after a verified Google/Clerk sign-in when the
     * account does not exist yet. It carries the verified identity so the follow-up phone+OTP
     * step can create the account without trusting client-supplied email/name.
     */
    public String generateRegistrationTicket(String email, String fullName, String avatarUrl) {
        Date now = new Date();
        return Jwts.builder()
                .subject(email)
                .claim("purpose", "google_register")
                .claim("fullName", fullName)
                .claim("avatarUrl", avatarUrl)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + registrationTicketMs))
                .signWith(signingKey)
                .compact();
    }

    /** Verifies signature + expiry + purpose of a registration ticket and returns its claims. */
    public Claims parseRegistrationTicket(String token) {
        Claims claims = extractAllClaims(token);
        if (!"google_register".equals(claims.get("purpose", String.class))) {
            throw new io.jsonwebtoken.JwtException("Token không phải vé đăng ký hợp lệ");
        }
        return claims;
    }

    private String buildToken(String username, Collection<String> roles, long ttlMs) {
        Date now = new Date();
        return Jwts.builder()
                .subject(username)
                .claim("roles", roles)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + ttlMs))
                .signWith(signingKey)
                .compact();
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    @SuppressWarnings("unchecked")
    public List<String> extractRoles(String token) {
        Object roles = extractAllClaims(token).get("roles");
        return roles instanceof List<?> list ? (List<String>) list : List.of();
    }

    public boolean isTokenValid(String token) {
        try {
            return extractClaim(token, Claims::getExpiration).after(new Date());
        } catch (Exception e) {
            return false;
        }
    }

    private <T> T extractClaim(String token, Function<Claims, T> resolver) {
        return resolver.apply(extractAllClaims(token));
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
