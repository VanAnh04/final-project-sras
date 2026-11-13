package com.sras.backend.security;

import com.sras.backend.exception.UnauthorizedException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

/**
 * Verifies a Clerk session token (RS256) against Clerk's public JWKS.
 *
 * <p>Keys are fetched (and cached/rotated) from {@code app.clerk.jwks-uri}. The token's signature,
 * issuer and expiry are validated; we do NOT trust any identity data from the client. The returned
 * subject is the Clerk user id ({@code user_...}), used afterwards to fetch the verified email via
 * {@link com.sras.backend.service.ClerkUserApiClient}.
 *
 * <p>The decoder is built lazily so the app still boots when Clerk env vars are absent (e.g. a
 * teammate without the {@code .env}); it only fails when the Clerk endpoints are actually called.
 */
@Component
@Slf4j
public class ClerkTokenVerifier {

    private final String jwksUri;
    private final String issuer;
    private volatile NimbusJwtDecoder decoder;

    public ClerkTokenVerifier(
            @Value("${app.clerk.jwks-uri:}") String jwksUri,
            @Value("${app.clerk.issuer:}") String issuer) {
        this.jwksUri = jwksUri;
        this.issuer = issuer;
    }

    private NimbusJwtDecoder decoder() {
        NimbusJwtDecoder local = decoder;
        if (local == null) {
            synchronized (this) {
                local = decoder;
                if (local == null) {
                    if (jwksUri == null || jwksUri.isBlank() || issuer == null || issuer.isBlank()) {
                        log.error("Clerk chua cau hinh CLERK_JWKS_URI hoac CLERK_ISSUER. jwksUri={}, issuer={}", jwksUri, issuer);
                        throw new UnauthorizedException(
                                "Clerk chưa được cấu hình (thiếu CLERK_JWKS_URI / CLERK_ISSUER)");
                    }
                    log.info("Khoi tao Clerk NimbusJwtDecoder voi jwksUri={} va issuer={}", jwksUri, issuer);
                    NimbusJwtDecoder d = NimbusJwtDecoder.withJwkSetUri(jwksUri).build();
                    OAuth2TokenValidator<Jwt> withIssuer = JwtValidators.createDefaultWithIssuer(issuer);
                    d.setJwtValidator(withIssuer);
                    decoder = local = d;
                }
            }
        }
        return local;
    }

    /** @return Jwt object if the token is valid; throws otherwise. */
    public Jwt verifyAndGetJwt(String token) {
        try {
            return decoder().decode(token);
        } catch (UnauthorizedException e) {
            throw e;
        } catch (Exception e) {
            log.error("ClerkTokenVerifier decode token that bai: {} ({})", e.getMessage(), e.getClass().getSimpleName());
            throw new UnauthorizedException("Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn");
        }
    }

    /** @return Clerk userId (the token subject) if the token is valid; throws otherwise. */
    public String verifyAndGetUserId(String token) {
        return verifyAndGetJwt(token).getSubject();
    }
}
