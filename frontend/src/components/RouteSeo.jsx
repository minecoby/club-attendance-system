import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const BASE_URL = "https://hanssup.minecoby.com";

const routeMeta = {
  "/": {
    title: "HANSSUP | 동아리 운영 플랫폼",
    description: "동아리 운영과 출석 관리를 한곳에서 처리할 수 있는 HANSSUP 서비스입니다.",
    index: true,
  },
  "/login": {
    title: "로그인 | HANSSUP",
    description: "HANSSUP 관리자 및 사용자 로그인 페이지입니다.",
    index: true,
  },
  "/register": {
    title: "관리자 가입 | HANSSUP",
    description: "HANSSUP 관리자 계정을 생성하고 동아리 운영을 시작하세요.",
    index: true,
  },
  "/privacy-policy": {
    title: "개인정보처리방침 | HANSSUP",
    description: "HANSSUP 개인정보처리방침 안내 페이지입니다.",
    index: true,
  },
  "/terms": {
    title: "이용약관 | HANSSUP",
    description: "HANSSUP 서비스 이용약관 안내 페이지입니다.",
    index: true,
  },
};

const defaultMeta = {
  title: "HANSSUP | 동아리 운영 플랫폼",
  description: "HANSSUP 동아리 운영 서비스",
  index: false,
};

const upsertMetaTag = (selector, attrs) => {
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement("meta");
    Object.entries(attrs).forEach(([key, value]) => {
      if (key !== "content") {
        tag.setAttribute(key, value);
      }
    });
    document.head.appendChild(tag);
  }
  if (attrs.content) {
    tag.setAttribute("content", attrs.content);
  }
};

const upsertCanonical = (href) => {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
};

function RouteSeo() {
  const location = useLocation();

  useEffect(() => {
    const meta = routeMeta[location.pathname] || defaultMeta;
    const canonical = `${BASE_URL}${location.pathname}`;
    const robots = meta.index ? "index, follow" : "noindex, nofollow";

    document.title = meta.title;
    upsertMetaTag('meta[name="description"]', { name: "description", content: meta.description });
    upsertMetaTag('meta[name="robots"]', { name: "robots", content: robots });
    upsertMetaTag('meta[property="og:title"]', { property: "og:title", content: meta.title });
    upsertMetaTag('meta[property="og:description"]', { property: "og:description", content: meta.description });
    upsertMetaTag('meta[property="og:url"]', { property: "og:url", content: canonical });
    upsertCanonical(canonical);
  }, [location.pathname]);

  return null;
}

export default RouteSeo;
