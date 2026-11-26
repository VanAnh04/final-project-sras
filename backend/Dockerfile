# ── Stage 1: Build file JAR với Maven và Java 17 ──
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Cấu hình mirror Google Cloud Maven Central tránh rate-limit HTTP 429 trên Render
RUN mkdir -p /root/.m2 && printf '<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"\n\
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n\
  xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0 https://maven.apache.org/xsd/settings-1.0.0.xsd">\n\
  <mirrors>\n\
    <mirror>\n\
      <id>google-maven-central</id>\n\
      <name>Google Maven Central</name>\n\
      <url>https://maven-central.storage-download.googleapis.com/maven2/</url>\n\
      <mirrorOf>central</mirrorOf>\n\
    </mirror>\n\
  </mirrors>\n\
</settings>\n' > /root/.m2/settings.xml

COPY pom.xml .
# Tải trước dependencies để tận dụng Docker cache
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn clean package -DskipTests

# ── Stage 2: Chạy ứng dụng với JRE 17 Alpine siêu nhẹ ──
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Tạo thư mục uploads nếu app có lưu file tĩnh
RUN mkdir -p /app/uploads

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
