# ── Stage 1: Build file JAR với Maven và Java 17 ──
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

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
