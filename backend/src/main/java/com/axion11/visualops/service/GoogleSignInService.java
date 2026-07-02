package com.axion11.visualops.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * Handles "Sign in with Google" — distinct from {@link GoogleDriveService} which handles Drive scope.
 * Reuses the same OAuth client (axion11-prod) but with different scopes and a different redirect URI.
 */
@Slf4j
@Service
public class GoogleSignInService {

    private static final String AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
    private static final String USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v3/userinfo";
    private static final String SCOPES = "openid email profile";

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${google.drive.client-id:}")
    private String clientId;

    @Value("${google.drive.client-secret:}")
    private String clientSecret;

    @Value("${google.signin.redirect-uri}")
    private String redirectUri;

    public boolean isConfigured() {
        return clientId != null && !clientId.isEmpty() && clientSecret != null && !clientSecret.isEmpty();
    }

    public String buildAuthorizationUrl(String state) {
        return buildAuthorizationUrl(state, null);
    }

    public String buildAuthorizationUrl(String state, String customRedirectUri) {
        String finalRedirectUri = (customRedirectUri != null && !customRedirectUri.isEmpty()) ? customRedirectUri : redirectUri;
        return AUTH_ENDPOINT
                + "?client_id=" + urlEncode(clientId)
                + "&redirect_uri=" + urlEncode(finalRedirectUri)
                + "&response_type=code"
                + "&scope=" + urlEncode(SCOPES)
                + "&include_granted_scopes=true"
                + "&prompt=select_account"
                + "&state=" + urlEncode(state);
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    public GoogleUserInfo exchangeCodeForUserInfo(String authCode) {
        return exchangeCodeForUserInfo(authCode, null);
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    public GoogleUserInfo exchangeCodeForUserInfo(String authCode, String customRedirectUri) {
        String finalRedirectUri = (customRedirectUri != null && !customRedirectUri.isEmpty()) ? customRedirectUri : redirectUri;
        // 1) Exchange code for tokens
        HttpHeaders tokenHeaders = new HttpHeaders();
        tokenHeaders.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("code", authCode);
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("redirect_uri", finalRedirectUri);
        form.add("grant_type", "authorization_code");

        ResponseEntity<Map> tokenResponse = restTemplate.postForEntity(
                TOKEN_ENDPOINT, new HttpEntity<>(form, tokenHeaders), Map.class);
        Map<String, Object> tokenBody = tokenResponse.getBody();
        if (tokenBody == null) throw new RuntimeException("Empty Google token response");
        String accessToken = (String) tokenBody.get("access_token");
        if (accessToken == null) throw new RuntimeException("No access_token in Google response");

        // 2) Fetch userinfo with the access token
        HttpHeaders uiHeaders = new HttpHeaders();
        uiHeaders.setBearerAuth(accessToken);
        ResponseEntity<Map> infoResponse = restTemplate.exchange(
                USERINFO_ENDPOINT, HttpMethod.GET, new HttpEntity<>(uiHeaders), Map.class);
        Map<String, Object> info = infoResponse.getBody();
        if (info == null) throw new RuntimeException("Empty Google userinfo response");

        GoogleUserInfo result = new GoogleUserInfo();
        result.sub = (String) info.get("sub");
        result.email = (String) info.get("email");
        Object verified = info.get("email_verified");
        result.emailVerified = verified instanceof Boolean ? (Boolean) verified : Boolean.parseBoolean(String.valueOf(verified));
        result.name = (String) info.get("name");
        result.picture = (String) info.get("picture");
        return result;
    }

    private static String urlEncode(String s) {
        return URLEncoder.encode(s == null ? "" : s, StandardCharsets.UTF_8);
    }

    public static class GoogleUserInfo {
        public String sub;
        public String email;
        public boolean emailVerified;
        public String name;
        public String picture;
    }
}
