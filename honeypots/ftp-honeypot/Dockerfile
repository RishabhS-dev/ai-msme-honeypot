FROM stilliard/pure-ftpd

ENV FTP_USER_NAME honeypotuser
ENV FTP_USER_PASS honeypotpass
ENV FTP_USER_HOME /home/ftpusers/honeypotuser

RUN mkdir -p $FTP_USER_HOME \
    && echo "honeypotfile.txt" > $FTP_USER_HOME/README.txt

CMD ["/run.sh", "-c", "50", "-E", "-j", "-R", "-P", "localhost"]
