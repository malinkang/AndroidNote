package com.malinkang.sqlitesample;

import com.activeandroid.Model;
import com.activeandroid.annotation.Column;
import com.activeandroid.annotation.Table;

/**
 * Created by malinkang on 15/7/16.
 */
@Table(name = "Teacher")
public class Teacher extends Model{
    @Column(name="Name")
    private String name;
    @Column(name="Age")
    private int  age;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getAge() {
        return age;
    }

    public void setAge(int age) {
        this.age = age;
    }
}
