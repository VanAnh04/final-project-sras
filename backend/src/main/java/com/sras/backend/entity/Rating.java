package com.sras.backend.entity;

import com.sras.backend.entity.enums.RatingDirection;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Two-way rating (G-14). */
@Getter
@Setter
@Entity
@Table(name = "ratings", indexes = @Index(
        name = "uq_rating", columnList = "request_id, direction", unique = true))
public class Rating extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "request_id", nullable = false)
    private RescueRequest request;

    @Enumerated(EnumType.STRING)
    @Column(name = "direction", nullable = false, length = 20)
    private RatingDirection direction;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rater_user_id", nullable = false)
    private User raterUser;

    /** 1–5. Đánh giá Gara (stars BETWEEN 1 AND 5). */
    @Column(name = "stars", nullable = false)
    private Short stars;

    @Column(name = "comment", length = 1000)
    private String comment;

    /** Thợ phụ trách được đánh giá (nếu có). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id")
    private GarageStaff staff;

    /** 1–5. Đánh giá riêng cho Thợ (staff_stars BETWEEN 1 AND 5). */
    @Column(name = "staff_stars")
    private Short staffStars;

    @Column(name = "staff_comment", length = 1000)
    private String staffComment;
}
